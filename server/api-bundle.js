// server/app.ts
import express from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";

// src/data/masterMateri.ts
var MASTER_MATERI_SEED = [
  // 1. Surat Pendek (14 Surat)
  { materi_id: "SRT-01", kategori: "Surat Pendek", nama_materi: "QS. Al-Fatihah", urutan: 1, aktif: true },
  { materi_id: "SRT-02", kategori: "Surat Pendek", nama_materi: "QS. An-Nas", urutan: 2, aktif: true },
  { materi_id: "SRT-03", kategori: "Surat Pendek", nama_materi: "QS. Al-Falaq", urutan: 3, aktif: true },
  { materi_id: "SRT-04", kategori: "Surat Pendek", nama_materi: "QS. Al-Ikhlas", urutan: 4, aktif: true },
  { materi_id: "SRT-05", kategori: "Surat Pendek", nama_materi: "QS. Al-Lahab", urutan: 5, aktif: true },
  { materi_id: "SRT-06", kategori: "Surat Pendek", nama_materi: "QS. An-Nasr", urutan: 6, aktif: true },
  { materi_id: "SRT-07", kategori: "Surat Pendek", nama_materi: "QS. Al-Kafirun", urutan: 7, aktif: true },
  { materi_id: "SRT-08", kategori: "Surat Pendek", nama_materi: "QS. Al-Kautsar", urutan: 8, aktif: true },
  { materi_id: "SRT-09", kategori: "Surat Pendek", nama_materi: "QS. Al-Ma'un", urutan: 9, aktif: true },
  { materi_id: "SRT-10", kategori: "Surat Pendek", nama_materi: "QS. Quraisy", urutan: 10, aktif: true },
  { materi_id: "SRT-11", kategori: "Surat Pendek", nama_materi: "QS. Al-Fil", urutan: 11, aktif: true },
  { materi_id: "SRT-12", kategori: "Surat Pendek", nama_materi: "QS. Al-Asr", urutan: 12, aktif: true },
  { materi_id: "SRT-13", kategori: "Surat Pendek", nama_materi: "QS. At-Takatsur", urutan: 13, aktif: true },
  { materi_id: "SRT-14", kategori: "Surat Pendek", nama_materi: "QS. Al-Qari'ah", urutan: 14, aktif: true },
  // 2. Doa Harian (14 Doa)
  { materi_id: "DOA-01", kategori: "Doa Harian", nama_materi: "Doa Sebelum Belajar", urutan: 15, aktif: true },
  { materi_id: "DOA-02", kategori: "Doa Harian", nama_materi: "Doa Sebelum Makan", urutan: 16, aktif: true },
  { materi_id: "DOA-03", kategori: "Doa Harian", nama_materi: "Doa Sesudah Makan", urutan: 17, aktif: true },
  { materi_id: "DOA-04", kategori: "Doa Harian", nama_materi: "Doa Untuk Kedua Orang Tua", urutan: 18, aktif: true },
  { materi_id: "DOA-05", kategori: "Doa Harian", nama_materi: "Doa Sebelum Tidur", urutan: 19, aktif: true },
  { materi_id: "DOA-06", kategori: "Doa Harian", nama_materi: "Doa Bangun Tidur", urutan: 20, aktif: true },
  { materi_id: "DOA-07", kategori: "Doa Harian", nama_materi: "Doa Masuk Kamar Mandi", urutan: 21, aktif: true },
  { materi_id: "DOA-08", kategori: "Doa Harian", nama_materi: "Doa Keluar Kamar Mandi", urutan: 22, aktif: true },
  { materi_id: "DOA-09", kategori: "Doa Harian", nama_materi: "Doa Keluar Rumah", urutan: 23, aktif: true },
  { materi_id: "DOA-10", kategori: "Doa Harian", nama_materi: "Doa Naik Kendaraan", urutan: 24, aktif: true },
  { materi_id: "DOA-11", kategori: "Doa Harian", nama_materi: "Doa Kebaikan Dunia & Akhirat", urutan: 25, aktif: true },
  { materi_id: "DOA-12", kategori: "Doa Harian", nama_materi: "Doa Bercermin", urutan: 26, aktif: true },
  { materi_id: "DOA-13", kategori: "Doa Harian", nama_materi: "Doa Masuk Masjid", urutan: 27, aktif: true },
  { materi_id: "DOA-14", kategori: "Doa Harian", nama_materi: "Doa Keluar Masjid", urutan: 28, aktif: true },
  // 3. Hijaiyah / Iqra (7 Tahap)
  { materi_id: "IQR-01", kategori: "Hijaiyah / Iqra", nama_materi: "Pengenalan Huruf Hijaiyah Tunggal (Alif\u2013Ya)", urutan: 29, aktif: true },
  { materi_id: "IQR-02", kategori: "Hijaiyah / Iqra", nama_materi: "Iqra Jilid 1 (Harakat Fathah)", urutan: 30, aktif: true },
  { materi_id: "IQR-03", kategori: "Hijaiyah / Iqra", nama_materi: "Iqra Jilid 2 (Huruf Sambung & Mad)", urutan: 31, aktif: true },
  { materi_id: "IQR-04", kategori: "Hijaiyah / Iqra", nama_materi: "Iqra Jilid 3 (Kasrah, Dhammah & Mad)", urutan: 32, aktif: true },
  { materi_id: "IQR-05", kategori: "Hijaiyah / Iqra", nama_materi: "Iqra Jilid 4 (Tanwin, Sukun & Qalqalah)", urutan: 33, aktif: true },
  { materi_id: "IQR-06", kategori: "Hijaiyah / Iqra", nama_materi: "Iqra Jilid 5 (Alif Lam, Tasydid & Waqaf)", urutan: 34, aktif: true },
  { materi_id: "IQR-07", kategori: "Hijaiyah / Iqra", nama_materi: "Iqra Jilid 6 (Tajwid Dasar & Persiapan Al-Qur'an)", urutan: 35, aktif: true },
  // 4. Hadits Pendek (10 Hadits)
  { materi_id: "HDT-01", kategori: "Hadits Pendek", nama_materi: "Hadits Kebersihan", urutan: 36, aktif: true },
  { materi_id: "HDT-02", kategori: "Hadits Pendek", nama_materi: "Hadits Senyum adalah Sedekah", urutan: 37, aktif: true },
  { materi_id: "HDT-03", kategori: "Hadits Pendek", nama_materi: "Hadits Kasih Sayang", urutan: 38, aktif: true },
  { materi_id: "HDT-04", kategori: "Hadits Pendek", nama_materi: "Hadits Larangan Marah", urutan: 39, aktif: true },
  { materi_id: "HDT-05", kategori: "Hadits Pendek", nama_materi: "Hadits Adab Makan & Minum", urutan: 40, aktif: true },
  { materi_id: "HDT-06", kategori: "Hadits Pendek", nama_materi: "Hadits Menuntut Ilmu", urutan: 41, aktif: true },
  { materi_id: "HDT-07", kategori: "Hadits Pendek", nama_materi: "Hadits Surga di Bawah Telapak Kaki Ibu", urutan: 42, aktif: true },
  { materi_id: "HDT-08", kategori: "Hadits Pendek", nama_materi: "Hadits Sesama Muslim Bersaudara", urutan: 43, aktif: true },
  { materi_id: "HDT-09", kategori: "Hadits Pendek", nama_materi: "Hadits Berkata Baik atau Diam", urutan: 44, aktif: true },
  { materi_id: "HDT-10", kategori: "Hadits Pendek", nama_materi: "Hadits Keutamaan Belajar & Mengajarkan Al-Qur'an", urutan: 45, aktif: true }
];

// src/data/masterTips.ts
var MASTER_TIPS_SEED = [
  // Antropometri (6)
  {
    tips_id: "TIP-01",
    kategori_pemicu: "Antropometri",
    kondisi_pemicu: "ANTRO_BB_KURANG",
    judul_tips: "Tambah Asupan Protein & Camilan Padat Gizi",
    isi_tips_ayah_bunda: "Sajikan porsi kecil tapi sering dengan lauk protein hewani (telur, ikan, ayam) serta camilan sehat seperti buah alpukat atau roti isi keju untuk mengejar kenaikan berat badan ananda.",
    aktif: true
  },
  {
    tips_id: "TIP-02",
    kategori_pemicu: "Antropometri",
    kondisi_pemicu: "ANTRO_BB_LEBIH",
    judul_tips: "Ajak Bermain Aktif & Perbanyak Serat Alami",
    isi_tips_ayah_bunda: "Kurangi camilan manis kemasan di rumah, perbanyak buah potong dan air putih, serta ajak ananda berlari, bersepeda, atau bermain bola di sore hari minimal 30 menit.",
    aktif: true
  },
  {
    tips_id: "TIP-03",
    kategori_pemicu: "Antropometri",
    kondisi_pemicu: "ANTRO_TB_PENDEK",
    judul_tips: "Optimalkan Protein Hewani, Kalsium & Tidur Nyenyak",
    isi_tips_ayah_bunda: "Hormon pertumbuhan bekerja optimal saat tidur malam lebih awal. Padukan dengan asupan protein harian (telur/ikan/susu) dan aktivitas melompat ringan.",
    aktif: true
  },
  {
    tips_id: "TIP-04",
    kategori_pemicu: "Antropometri",
    kondisi_pemicu: "ANTRO_LILA_LK_PERHATIAN",
    judul_tips: "Pantau Pola Makan & Konsultasikan Secara Berkala",
    isi_tips_ayah_bunda: "Pastikan asupan zat besi, vitamin, dan energi harian ananda tercukupi. Ayah & Bunda juga dapat berkonsultasi ke Posyandu atau Puskesmas terdekat untuk pemantauan lanjutan.",
    aktif: true
  },
  {
    tips_id: "TIP-05",
    kategori_pemicu: "Antropometri",
    kondisi_pemicu: "ANTRO_TREN_STAGNAN",
    judul_tips: "Variasikan Menu Bekal agar Berat Badan Naik Stabil",
    isi_tips_ayah_bunda: "Pertumbuhan bulan ini cenderung mendatar dibanding bulan lalu. Coba kreasikan bentuk bento bekal sekolah yang menarik dan tambahkan lemak sehat seperti minyak zaitun atau santan pada masakan.",
    aktif: true
  },
  {
    tips_id: "TIP-06",
    kategori_pemicu: "Antropometri",
    kondisi_pemicu: "ANTRO_NORMAL",
    judul_tips: "Pertahankan Gizi Seimbang & Kebiasaan Aktif Ananda",
    isi_tips_ayah_bunda: "Alhamdulillah, pertumbuhan fisik ananda berada di jalur yang sehat. Teruskan pola makan gizi seimbang (Isi Piringku), minum air putih cukup, dan bermain aktif di rumah.",
    aktif: true
  },
  // Literasi (12)
  {
    tips_id: "TIP-07",
    kategori_pemicu: "Literasi",
    kondisi_pemicu: "LIT_A_HURUF_LOW",
    judul_tips: "Kenalkan Huruf Lewat Benda Sekitar Rumah",
    isi_tips_ayah_bunda: "Ajak ananda mencari huruf awal namanya pada kemasan makanan, papan nama jalan, atau kartu huruf magnet sambil bernyanyi agar pengenalan huruf A\u2013Z terasa seperti permainan.",
    aktif: true
  },
  {
    tips_id: "TIP-08",
    kategori_pemicu: "Literasi",
    kondisi_pemicu: "LIT_A_SUKUKATA_LOW",
    judul_tips: "Tepuk Suku Kata Mudah (ba-bi-bu) 5 Menit",
    isi_tips_ayah_bunda: "Latih gabungan huruf konsonan dan vokal sambil bertepuk tangan (misal: ba-ju, bo-la, ma-ma). Cukup 5 menit sehari dengan suasana ceria tanpa memaksa.",
    aktif: true
  },
  {
    tips_id: "TIP-09",
    kategori_pemicu: "Literasi",
    kondisi_pemicu: "LIT_A_HIGH",
    judul_tips: "Bacakan Buku Cerita Bergambar Sebelum Tidur",
    isi_tips_ayah_bunda: "Ananda sudah menguasai huruf dan suku kata dasar dengan baik! Ajak ananda menunjuk kata-kata pendek di buku cerita bergambar sebelum tidur untuk menumbuhkan minat baca.",
    aktif: true
  },
  {
    tips_id: "TIP-10",
    kategori_pemicu: "Literasi",
    kondisi_pemicu: "LIT_B_TRACK1_LOW",
    judul_tips: "Perkuat Pondasi Huruf & Suku Kata Terbuka",
    isi_tips_ayah_bunda: "Fokuskan latihan pada 3\u20135 huruf yang masih sering tertukar (seperti b/d atau p/q) lalu gabungkan menjadi suku kata terbuka yang sering ditemui sehari-hari.",
    aktif: true
  },
  {
    tips_id: "TIP-11",
    kategori_pemicu: "Literasi",
    kondisi_pemicu: "LIT_B_TRACK1_HIGH",
    judul_tips: "Siap Melangkah ke Kata Bermakna",
    isi_tips_ayah_bunda: "Fondasi huruf dan suku kata dasar ananda sudah kokoh. Mulai ajak ananda merangkai dua suku kata menjadi nama benda kesukaannya seperti bo-la atau ro-ti.",
    aktif: true
  },
  {
    tips_id: "TIP-12",
    kategori_pemicu: "Literasi",
    kondisi_pemicu: "LIT_B_TRACK2_LOW",
    judul_tips: "Bermain Tebak Kata Berhuruf Mati & Gabungan ng/ny",
    isi_tips_ayah_bunda: "Saat bermain di dapur atau ruang tamu, ajak ananda membaca label benda sederhana seperti ge-las, pin-tu, atau bu-nga agar terbiasa dengan akhiran konsonan.",
    aktif: true
  },
  {
    tips_id: "TIP-13",
    kategori_pemicu: "Literasi",
    kondisi_pemicu: "LIT_B_TRACK2_HIGH",
    judul_tips: "Mulai Baca Kalimat Pendek 3 Kata",
    isi_tips_ayah_bunda: 'MasyaAllah, ananda sudah lancar membaca suku kata lanjutan. Ajak ananda membaca kalimat pendek 3 kata seperti "Ibu beli roti" dari buku cerita anak.',
    aktif: true
  },
  {
    tips_id: "TIP-14",
    kategori_pemicu: "Literasi",
    kondisi_pemicu: "LIT_B_TRACK3_LOW",
    judul_tips: "Latih Pemahaman Makna Kalimat Lewat Tanya Jawab",
    isi_tips_ayah_bunda: 'Setelah ananda membaca satu kalimat pendek, tanyakan "Siapa yang ada di kalimat itu?" atau "Sedang apa dia?" agar ananda membaca sambil memahami maknanya.',
    aktif: true
  },
  {
    tips_id: "TIP-15",
    kategori_pemicu: "Literasi",
    kondisi_pemicu: "LIT_B_TRACK3_HIGH",
    judul_tips: "Tantang Ananda Membaca Cerita Pendek 3 Kalimat",
    isi_tips_ayah_bunda: "Kemampuan membaca kalimat ananda sangat baik! Ajak ananda membaca buku cerita seri PAUD dan menceritakan kembali bagian favoritnya dengan bahasanya sendiri.",
    aktif: true
  },
  {
    tips_id: "TIP-16",
    kategori_pemicu: "Literasi",
    kondisi_pemicu: "LIT_B_TRACK4_LOW",
    judul_tips: "Berdiskusi Santai Setelah Membaca Paragraf",
    isi_tips_ayah_bunda: "Dampingi ananda membaca paragraf pendek per kalimat tanpa terburu-buru, lalu ajak berdiskusi tentang tokoh dan pesan kebaikan dalam cerita.",
    aktif: true
  },
  {
    tips_id: "TIP-17",
    kategori_pemicu: "Literasi",
    kondisi_pemicu: "LIT_B_TRACK4_HIGH",
    judul_tips: "Apresiasi Kemampuan Next Level & Kebiasaan Membaca",
    isi_tips_ayah_bunda: "MasyaAllah! Ananda sudah lancar membaca paragraf dan menceritakan kembali. Sediakan pojok baca kecil di rumah dengan buku kisah nabi atau ensiklopedia anak.",
    aktif: true
  },
  {
    tips_id: "TIP-18",
    kategori_pemicu: "Literasi",
    kondisi_pemicu: "LIT_B_KUSTOM",
    judul_tips: "Dampingi Target Literasi Personal Ananda",
    isi_tips_ayah_bunda: "Guru menyiapkan target literasi khusus sesuai minat dan tempo belajar ananda. Luangkan waktu 5\u201310 menit setiap sore untuk mengulang catatan belajar dari guru.",
    aktif: true
  },
  // 7 KAIH (8)
  {
    tips_id: "TIP-19",
    kategori_pemicu: "7 KAIH",
    kondisi_pemicu: "KAIH_BANGUN_PAGI_LOW",
    judul_tips: "Bangun Pagi Lebih Segar dengan Rutinitas Malam",
    isi_tips_ayah_bunda: "Siapkan baju dan tas sekolah bersama ananda di malam hari serta pasang alarm lagu ceria atau sapaan lembut saat subuh agar ananda bersemangat bangun pagi.",
    aktif: true
  },
  {
    tips_id: "TIP-20",
    kategori_pemicu: "7 KAIH",
    kondisi_pemicu: "KAIH_BERIBADAH_LOW",
    judul_tips: "Teladani Ibadah Bersama dengan Penuh Cinta",
    isi_tips_ayah_bunda: "Ajak ananda menggelar sajadah kecilnya di sebelah Ayah & Bunda saat shalat berjamaah atau membaca doa sebelum makan agar ibadah terasa hangat.",
    aktif: true
  },
  {
    tips_id: "TIP-21",
    kategori_pemicu: "7 KAIH",
    kondisi_pemicu: "KAIH_BEROLAHRAGA_LOW",
    judul_tips: "Gerak Pagi atau Sore 15 Menit Bersama Keluarga",
    isi_tips_ayah_bunda: "Ajak ananda senam ceria, jalan kaki santai keliling kompleks, atau bermain lempar tangkap bola di halaman untuk melatih motorik kasar dan kebugaran.",
    aktif: true
  },
  {
    tips_id: "TIP-22",
    kategori_pemicu: "7 KAIH",
    kondisi_pemicu: "KAIH_MAKAN_SEHAT_LOW",
    judul_tips: "Eksplorasi Buah & Sayur Warna-Warni",
    isi_tips_ayah_bunda: "Libatkan ananda saat mencuci sayur atau menyusun potongan buah warna-warni di piringnya agar ia lebih antusias mencoba makanan bergizi.",
    aktif: true
  },
  {
    tips_id: "TIP-23",
    kategori_pemicu: "7 KAIH",
    kondisi_pemicu: "KAIH_GEMAR_BELAJAR_LOW",
    judul_tips: "Ciptakan Waktu Belajar Menyenangkan Tanpa Gawai",
    isi_tips_ayah_bunda: "Sediakan 10 menit waktu bermain edukatif seperti balok, menggambar, atau membaca buku cerita sambil menjawab pertanyaan rasa ingin tahu ananda.",
    aktif: true
  },
  {
    tips_id: "TIP-24",
    kategori_pemicu: "7 KAIH",
    kondisi_pemicu: "KAIH_BERMASYARAKAT_LOW",
    judul_tips: "Latih Sapa, Senyum & Berbagi dengan Tetangga",
    isi_tips_ayah_bunda: "Biasakan ananda mengucapkan salam saat bertemu tetangga atau teman sebaya serta berbagi makanan sederhana untuk melatih kepekaan sosialnya.",
    aktif: true
  },
  {
    tips_id: "TIP-25",
    kategori_pemicu: "7 KAIH",
    kondisi_pemicu: "KAIH_TIDUR_CEPAT_LOW",
    judul_tips: "Matikan Layar 1 Jam Sebelum Tidur",
    isi_tips_ayah_bunda: "Redupkan lampu kamar pukul 20.00, hindari tontonan layar sebelum tidur, dan ganti dengan doa tidur serta cerita pengantar tidur yang menenangkan.",
    aktif: true
  },
  {
    tips_id: "TIP-26",
    kategori_pemicu: "7 KAIH",
    kondisi_pemicu: "KAIH_ALL_HIGH",
    judul_tips: "Hebat! 7 Kebiasaan Anak Indonesia Hebat Sudah Terbentuk",
    isi_tips_ayah_bunda: "MasyaAllah, Ayah & Bunda konsisten membimbing 7 kebiasaan hebat ananda di rumah. Berikan pelukan hangat dan pujian spesifik atas usaha ananda setiap hari!",
    aktif: true
  },
  // Keagamaan (8)
  {
    tips_id: "TIP-27",
    kategori_pemicu: "Keagamaan",
    kondisi_pemicu: "AGAMA_SURAT_LOW",
    judul_tips: "Putar Murottal Surat Pendek Saat Persiapan Pagi",
    isi_tips_ayah_bunda: "Perdengarkan murottal surat pendek yang sedang dipelajari di sekolah secara berulang saat ananda sarapan atau bersiap tidur agar hafalan melekat alami.",
    aktif: true
  },
  {
    tips_id: "TIP-28",
    kategori_pemicu: "Keagamaan",
    kondisi_pemicu: "AGAMA_SURAT_HIGH",
    judul_tips: "Jadikan Ananda Imam Mini saat Murajaah Surat",
    isi_tips_ayah_bunda: "Alhamdulillah hafalan surat pendek ananda sangat baik. Sesekali minta ananda melafalkan surat pilihannya di hadapan keluarga untuk menguatkan rasa percaya diri.",
    aktif: true
  },
  {
    tips_id: "TIP-29",
    kategori_pemicu: "Keagamaan",
    kondisi_pemicu: "AGAMA_DOA_LOW",
    judul_tips: "Praktikkan Doa Harian Tepat di Momennya",
    isi_tips_ayah_bunda: "Ucapkan doa sebelum makan, masuk kamar mandi, atau naik kendaraan secara lantang dan lembut bersama ananda tepat sebelum aktivitas dimulai.",
    aktif: true
  },
  {
    tips_id: "TIP-30",
    kategori_pemicu: "Keagamaan",
    kondisi_pemicu: "AGAMA_DOA_HIGH",
    judul_tips: "Apresiasi Kebiasaan Doa Mandiri Ananda",
    isi_tips_ayah_bunda: "MasyaAllah, ananda sudah terbiasa berdoa mandiri! Ajarkan arti singkat dari doa tersebut agar ananda memahami bahwa Allah selalu mendengar doa anak shalih.",
    aktif: true
  },
  {
    tips_id: "TIP-31",
    kategori_pemicu: "Keagamaan",
    kondisi_pemicu: "AGAMA_IQRA_LOW",
    judul_tips: "Murajaah Halaman Iqra 5 Menit Setelah Maghrib",
    isi_tips_ayah_bunda: "Dampingi ananda mengulang 2\u20133 baris halaman Iqra terakhirnya setiap ba\u2019da Maghrib agar huruf hijaiyah dan harakatnya semakin mantap sebelum lanjut halaman.",
    aktif: true
  },
  {
    tips_id: "TIP-32",
    kategori_pemicu: "Keagamaan",
    kondisi_pemicu: "AGAMA_IQRA_HIGH",
    judul_tips: "Jaga Semangat Mengaji Iqra Ananda",
    isi_tips_ayah_bunda: "Bacaan Iqra ananda semakin lancar! Berikan stiker bintang atau pelukan apresiasi setiap kali ananda tuntas satu halaman dengan tertib.",
    aktif: true
  },
  {
    tips_id: "TIP-33",
    kategori_pemicu: "Keagamaan",
    kondisi_pemicu: "AGAMA_HADITS_LOW",
    judul_tips: "Hubungkan Hadits Pendek dengan Sikap Sehari-hari",
    isi_tips_ayah_bunda: 'Saat ananda tersenyum atau merapikan mainan, ingatkan hadits terkait ("Senyum itu sedekah" / "Kebersihan sebagian dari iman") agar mudah diingat maknanya.',
    aktif: true
  },
  {
    tips_id: "TIP-34",
    kategori_pemicu: "Keagamaan",
    kondisi_pemicu: "AGAMA_HADITS_HIGH",
    judul_tips: "Teladani Pengamalan Hadits di Rumah",
    isi_tips_ayah_bunda: "Alhamdulillah ananda sudah hafal dan memahami hadits pendek! Puji ananda saat ia mempraktikkan adab makan, senyum, dan kasih sayang di rumah.",
    aktif: true
  }
];

// src/data/bankMateriHarian.ts
var BANK_MATERI_HARIAN_SEED = [
  // A. LITERASI — TAHAP 1: HURUF A-Z
  { kode_item: "HRF-01", bidang: "Literasi", level_track: "Kelas A / Track 1", kategori: "Huruf", label_kelompok: "Huruf Vokal", isi_item: "a|i|u|e|o", pertanyaan_cek: "", aktif: true },
  { kode_item: "HRF-02", bidang: "Literasi", level_track: "Kelas A / Track 1", kategori: "Huruf", label_kelompok: "Konsonan Dasar 1", isi_item: "b|c|d|f|g", pertanyaan_cek: "", aktif: true },
  { kode_item: "HRF-03", bidang: "Literasi", level_track: "Kelas A / Track 1", kategori: "Huruf", label_kelompok: "Konsonan Dasar 2", isi_item: "h|j|k|l|m", pertanyaan_cek: "", aktif: true },
  { kode_item: "HRF-04", bidang: "Literasi", level_track: "Kelas A / Track 1", kategori: "Huruf", label_kelompok: "Konsonan Dasar 3", isi_item: "n|p|r|s|t", pertanyaan_cek: "", aktif: true },
  { kode_item: "HRF-05", bidang: "Literasi", level_track: "Kelas A / Track 1", kategori: "Huruf", label_kelompok: "Konsonan Lanjutan", isi_item: "v|w|x|y|z|q", pertanyaan_cek: "", aktif: true },
  { kode_item: "HRF-06", bidang: "Literasi", level_track: "Kelas A / Track 1", kategori: "Huruf", label_kelompok: "Pembedaan Huruf Mirip", isi_item: "b - d|p - q|m - n|u - n|f - t", pertanyaan_cek: "", aktif: true },
  { kode_item: "HRF-07", bidang: "Literasi", level_track: "Kelas A / Track 1", kategori: "Huruf", label_kelompok: "Pasangan Kapital & Kecil", isi_item: "Aa|Bb|Cc|Dd|Ee|Ff|Gg|Hh|Ii|Jj|Kk|Ll|Mm|Nn|Oo|Pp|Qq|Rr|Ss|Tt|Uu|Vv|Ww|Xx|Yy|Zz", pertanyaan_cek: "", aktif: true },
  // B. LITERASI — TAHAP 2: SUKU KATA MUDAH KV
  { kode_item: "SKM-01", bidang: "Literasi", level_track: "Kelas A / Track 1", kategori: "Suku Kata", label_kelompok: "Suku Kata B & C", isi_item: "ba|bi|bu|be|bo|ca|ci|cu|ce|co", pertanyaan_cek: "", aktif: true },
  { kode_item: "SKM-02", bidang: "Literasi", level_track: "Kelas A / Track 1", kategori: "Suku Kata", label_kelompok: "Suku Kata D & F", isi_item: "da|di|du|de|do|fa|fi|fu|fe|fo", pertanyaan_cek: "", aktif: true },
  { kode_item: "SKM-03", bidang: "Literasi", level_track: "Kelas A / Track 1", kategori: "Suku Kata", label_kelompok: "Suku Kata G & H", isi_item: "ga|gi|gu|ge|go|ha|hi|hu|he|ho", pertanyaan_cek: "", aktif: true },
  { kode_item: "SKM-04", bidang: "Literasi", level_track: "Kelas A / Track 1", kategori: "Suku Kata", label_kelompok: "Suku Kata J & K", isi_item: "ja|ji|ju|je|jo|ka|ki|ku|ke|ko", pertanyaan_cek: "", aktif: true },
  { kode_item: "SKM-05", bidang: "Literasi", level_track: "Kelas A / Track 1", kategori: "Suku Kata", label_kelompok: "Suku Kata L & M", isi_item: "la|li|lu|le|lo|ma|mi|mu|me|mo", pertanyaan_cek: "", aktif: true },
  { kode_item: "SKM-06", bidang: "Literasi", level_track: "Kelas A / Track 1", kategori: "Suku Kata", label_kelompok: "Suku Kata N & P", isi_item: "na|ni|nu|ne|no|pa|pi|pu|pe|po", pertanyaan_cek: "", aktif: true },
  { kode_item: "SKM-07", bidang: "Literasi", level_track: "Kelas A / Track 1", kategori: "Suku Kata", label_kelompok: "Suku Kata R & S", isi_item: "ra|ri|ru|re|ro|sa|si|su|se|so", pertanyaan_cek: "", aktif: true },
  { kode_item: "SKM-08", bidang: "Literasi", level_track: "Kelas A / Track 1", kategori: "Suku Kata", label_kelompok: "Suku Kata T & W", isi_item: "ta|ti|tu|te|to|wa|wi|wu|we|wo", pertanyaan_cek: "", aktif: true },
  { kode_item: "SKM-09", bidang: "Literasi", level_track: "Kelas A / Track 1", kategori: "Suku Kata", label_kelompok: "Suku Kata Y, V, Z", isi_item: "ya|yi|yu|ye|yo|va|vi|vu|ve|vo|za|zi|zu|ze|zo", pertanyaan_cek: "", aktif: true },
  // C. LITERASI — TAHAP 3: KATA MUDAH 2 SUKU KATA
  { kode_item: "KTM-01", bidang: "Literasi", level_track: "Kelas A / Track 1", kategori: "Kata", label_kelompok: "Pola Vokal + KV", isi_item: "i-bu|i-ni|i-tu|a-pi|u-bi|a-ku|a-pa|o-ba|i-ka|e-sa", pertanyaan_cek: "", aktif: true },
  { kode_item: "KTM-02", bidang: "Literasi", level_track: "Kelas A / Track 1", kategori: "Kata", label_kelompok: "Suku Kata Kembar", isi_item: "ma-ma|pa-pa|pi-pi|da-da|ku-ku|gi-gi|cu-cu|ba-ba|su-su|ki-ki", pertanyaan_cek: "", aktif: true },
  { kode_item: "KTM-03", bidang: "Literasi", level_track: "Kelas A / Track 1", kategori: "Kata", label_kelompok: "Anggota Tubuh & Keluarga", isi_item: "ma-ta|ka-ki|ja-ri|da-hi|ba-hu|bi-bi|a-di|ka-ka|da-gu|lu-ka", pertanyaan_cek: "", aktif: true },
  { kode_item: "KTM-04", bidang: "Literasi", level_track: "Kelas A / Track 1", kategori: "Kata", label_kelompok: "Benda & Makanan", isi_item: "bo-la|ba-ju|bu-ku|me-ja|to-pi|ro-ti|gu-la|ko-pi|sa-te|ka-ca", pertanyaan_cek: "", aktif: true },
  { kode_item: "KTM-05", bidang: "Literasi", level_track: "Kelas A / Track 1", kategori: "Kata", label_kelompok: "Hewan & Alam", isi_item: "ku-da|ru-sa|sa-pi|le-le|ku-tu|ba-tu|ka-yu|ma-du|la-bu|pa-di", pertanyaan_cek: "", aktif: true },
  { kode_item: "KTM-06", bidang: "Literasi", level_track: "Kelas A / Track 1", kategori: "Kata", label_kelompok: "Kata Kerja Sederhana", isi_item: "ba-ca|be-li|cu-ci|bu-ka|lu-pa|la-ri|da-ri|ka-si|pu-ja|ti-ru", pertanyaan_cek: "", aktif: true },
  // D. LITERASI — TAHAP 4: KATA LANJUTAN
  { kode_item: "KTL-01", bidang: "Literasi", level_track: "Kelas B / Track 2", kategori: "Kata", label_kelompok: "3 Suku Kata Terbuka", isi_item: "se-pa-tu|ke-la-pa|ke-me-ja|ke-re-ta|le-ma-ri|pe-pa-ya|ka-me-ra|se-pe-da", pertanyaan_cek: "", aktif: true },
  { kode_item: "KTL-02", bidang: "Literasi", level_track: "Kelas B / Track 2", kategori: "Kata", label_kelompok: "Akhiran Mati -n & -m", isi_item: "i-kan|ba-lon|ma-kan|ja-lan|hu-jan|a-yam|mi-num|ko-lam|ta-nam|ma-lam", pertanyaan_cek: "", aktif: true },
  { kode_item: "KTL-03", bidang: "Literasi", level_track: "Kelas B / Track 2", kategori: "Kata", label_kelompok: "Akhiran Mati -r & -l", isi_item: "pa-sar|a-ir|ti-dur|mo-tor|ka-pal|a-pel|mo-bil|bo-tol|be-tul|sa-yur", pertanyaan_cek: "", aktif: true },
  { kode_item: "KTL-04", bidang: "Literasi", level_track: "Kelas B / Track 2", kategori: "Kata", label_kelompok: "Akhiran Mati -s, -t, -h", isi_item: "ge-las|be-ras|ti-kus|se-mut|la-ngit|sa-kit|ru-mah|ga-jah|bu-ah|me-rah", pertanyaan_cek: "", aktif: true },
  { kode_item: "KTL-05", bidang: "Literasi", level_track: "Kelas B / Track 2", kategori: "Kata", label_kelompok: "Akhiran Mati -k & -p", isi_item: "be-bek|ka-kak|a-dik|je-ruk|ci-cak|a-sap|a-tap|ti-up|tu-tup|si-ap", pertanyaan_cek: "", aktif: true },
  { kode_item: "KTL-06", bidang: "Literasi", level_track: "Kelas B / Track 2", kategori: "Kata", label_kelompok: "Huruf Mati di Tengah", isi_item: "ban-tal|pin-tu|lam-pu|man-di|kun-ci|kam-bing|rum-put|san-dal|tas-bih|mas-jid", pertanyaan_cek: "", aktif: true },
  { kode_item: "KTL-07", bidang: "Literasi", level_track: "Kelas B / Track 2", kategori: "Kata", label_kelompok: "Gabungan ng", isi_item: "bu-nga|si-nga|u-ngu|ta-ngan|pi-sang|ku-cing|bu-rung|pa-yung|to-peng|ba-ngun", pertanyaan_cek: "", aktif: true },
  { kode_item: "KTL-08", bidang: "Literasi", level_track: "Kelas B / Track 2", kategori: "Kata", label_kelompok: "Gabungan ny", isi_item: "nya-muk|nya-nyi|pe-nyu|ba-nyak|ta-nya|pu-nya|su-nyi|me-nya-pu|bu-nyi", pertanyaan_cek: "", aktif: true },
  { kode_item: "KTL-09", bidang: "Literasi", level_track: "Kelas B / Track 2", kategori: "Kata", label_kelompok: "Diftong ai, au, oi", isi_item: "pan-tai|san-tai|ca-bai|pu-lau|hi-jau|ker-bau|pi-sau|da-nau|am-boi|se-poi", pertanyaan_cek: "", aktif: true },
  { kode_item: "KTL-10", bidang: "Literasi", level_track: "Kelas B / Track 2", kategori: "Kata", label_kelompok: "Gabungan kh, sy & Klaster", isi_item: "kha-bar|syu-kur|sya-rat|truk|pra-mu-ka|stro-be-ri|se-ko-lah|kra-yon|plas-tik", pertanyaan_cek: "", aktif: true },
  // E. LITERASI — TAHAP 5: KALIMAT SEDERHANA
  { kode_item: "KLM-01", bidang: "Literasi", level_track: "Kelas B / Track 3", kategori: "Kalimat", label_kelompok: "Kalimat 3 Kata Terbuka", isi_item: "Ini buku baru.|Ibu beli roti.|Budi suka bola.|Siti cuci baju.|Rina baca buku.", pertanyaan_cek: "", aktif: true },
  { kode_item: "KLM-02", bidang: "Literasi", level_track: "Kelas B / Track 3", kategori: "Kalimat", label_kelompok: "Kalimat 3-4 Kata Berhuruf Mati", isi_item: "Ayah minum kopi panas.|Adik makan buah apel.|Bola merah di kamar.|Kakak pergi ke pasar.|Kami shalat di masjid.", pertanyaan_cek: "", aktif: true },
  { kode_item: "KLM-03", bidang: "Literasi", level_track: "Kelas B / Track 3", kategori: "Kalimat", label_kelompok: "Kalimat dengan ng & ny", isi_item: "Bunga mawar warna ungu.|Kucing putih makan ikan.|Adik bangun pagi sekali.|Ibu menyapu halaman rumah.|Burung terbang tinggi di langit.", pertanyaan_cek: "", aktif: true },
  { kode_item: "KLM-04", bidang: "Literasi", level_track: "Kelas B / Track 3", kategori: "Kalimat", label_kelompok: "Kalimat Kebiasaan Baik & Islami", isi_item: "Aku berdoa sebelum makan.|Siti membantu ibu mencuci piring.|Ali rajin mengaji setiap sore.|Kami berbagi mainan dengan teman.|Tidur cepat agar badan sehat.", pertanyaan_cek: "", aktif: true },
  { kode_item: "KLM-05", bidang: "Literasi", level_track: "Kelas B / Track 3", kategori: "Kalimat", label_kelompok: "Kalimat Tanya & Seru", isi_item: "Siapa nama teman barumu?|Di mana sepatu sekolahku?|Ayo kita cuci tangan dulu!|Wah, gambar pohonmu bagus sekali!", pertanyaan_cek: "", aktif: true },
  // F. LITERASI — TAHAP 6: PARAGRAF PENDEK NEXT LEVEL
  { kode_item: "PRG-01", bidang: "Literasi", level_track: "Kelas B / Track 4 (Next Level)", kategori: "Paragraf", label_kelompok: "Pagi Hari di Rumah", isi_item: "Pagi ini cuaca sangat cerah. Ali bangun tidur lalu merapikan bantalnya. Setelah mandi, Ali sarapan nasi dan telur bersama ayah dan ibu.", pertanyaan_cek: "Apa yang Ali lakukan setelah bangun tidur?", aktif: true },
  { kode_item: "PRG-02", bidang: "Literasi", level_track: "Kelas B / Track 4 (Next Level)", kategori: "Paragraf", label_kelompok: "Kucing Kecil Milik Rina", isi_item: "Rina punya seekor kucing kecil bernama Miu. Bulu Miu berwarna putih dan lembut. Setiap sore, Rina memberi Miu makan ikan dan air minum.", pertanyaan_cek: "Siapa nama kucing Rina dan apa warnanya?", aktif: true },
  { kode_item: "PRG-03", bidang: "Literasi", level_track: "Kelas B / Track 4 (Next Level)", kategori: "Paragraf", label_kelompok: "Pergi ke Masjid", isi_item: "Suara adzan Maghrib sudah terdengar. Hasan segera mengambil air wudhu. Ia memakai baju koko dan peci, lalu berjalan ke masjid bersama ayah.", pertanyaan_cek: "Kapan Hasan pergi ke masjid dan bersama siapa?", aktif: true },
  { kode_item: "PRG-04", bidang: "Literasi", level_track: "Kelas B / Track 4 (Next Level)", kategori: "Paragraf", label_kelompok: "Kebun Buah Kakek", isi_item: "Hari Minggu kami berkunjung ke rumah kakek. Di belakang rumah ada pohon mangga dan pepaya. Kami memetik buah yang sudah matang dengan gembira.", pertanyaan_cek: "Buah apa saja yang ada di kebun kakek?", aktif: true },
  { kode_item: "PRG-05", bidang: "Literasi", level_track: "Kelas B / Track 4 (Next Level)", kategori: "Paragraf", label_kelompok: "Berbagi Bekal di Sekolah", isi_item: "Saat jam istirahat, Siti membuka kotak bekalnya. Ia membawa roti isi dan potongan buah jeruk. Siti berbagi sepotong roti dengan temannya yang lupa membawa bekal.", pertanyaan_cek: "Sikap baik apa yang dilakukan Siti kepada temannya?", aktif: true },
  { kode_item: "PRG-06", bidang: "Literasi", level_track: "Kelas B / Track 4 (Next Level)", kategori: "Paragraf", label_kelompok: "Menjaga Kebersihan", isi_item: "Halaman sekolah hari ini penuh daun kering. Ibu guru mengajak semua murid bekerja bakti. Sampah daun dimasukkan ke tempat sampah agar sekolah bersih dan nyaman.", pertanyaan_cek: "Mengapa kita harus membuang sampah pada tempatnya?", aktif: true },
  // G. HIJAIYAH — HURUF TUNGGAL
  { kode_item: "HIJ-01", bidang: "Hijaiyah_Iqra", level_track: "Pra-Iqra", kategori: "Hijaiyah", label_kelompok: "Kelompok 1 (Alif - Tsa)", isi_item: "\u0627 (Alif)|\u0628 (Ba)|\u062A (Ta)|\u062B (Tsa)", pertanyaan_cek: "", aktif: true },
  { kode_item: "HIJ-02", bidang: "Hijaiyah_Iqra", level_track: "Pra-Iqra", kategori: "Hijaiyah", label_kelompok: "Kelompok 2 (Jim - Kha)", isi_item: "\u062C (Jim)|\u062D (Ha)|\u062E (Kha)", pertanyaan_cek: "", aktif: true },
  { kode_item: "HIJ-03", bidang: "Hijaiyah_Iqra", level_track: "Pra-Iqra", kategori: "Hijaiyah", label_kelompok: "Kelompok 3 (Dal - Zai)", isi_item: "\u062F (Dal)|\u0630 (Dzal)|\u0631 (Ra)|\u0632 (Zai)", pertanyaan_cek: "", aktif: true },
  { kode_item: "HIJ-04", bidang: "Hijaiyah_Iqra", level_track: "Pra-Iqra", kategori: "Hijaiyah", label_kelompok: "Kelompok 4 (Sin - Dhad)", isi_item: "\u0633 (Sin)|\u0634 (Syin)|\u0635 (Shad)|\u0636 (Dhad)", pertanyaan_cek: "", aktif: true },
  { kode_item: "HIJ-05", bidang: "Hijaiyah_Iqra", level_track: "Pra-Iqra", kategori: "Hijaiyah", label_kelompok: "Kelompok 5 (Tha - Ghain)", isi_item: "\u0637 (Tha)|\u0638 (Zha)|\u0639 (Ain)|\u063A (Ghain)", pertanyaan_cek: "", aktif: true },
  { kode_item: "HIJ-06", bidang: "Hijaiyah_Iqra", level_track: "Pra-Iqra", kategori: "Hijaiyah", label_kelompok: "Kelompok 6 (Fa - Lam)", isi_item: "\u0641 (Fa)|\u0642 (Qaf)|\u0643 (Kaf)|\u0644 (Lam)", pertanyaan_cek: "", aktif: true },
  { kode_item: "HIJ-07", bidang: "Hijaiyah_Iqra", level_track: "Pra-Iqra", kategori: "Hijaiyah", label_kelompok: "Kelompok 7 (Mim - Ya)", isi_item: "\u0645 (Mim)|\u0646 (Nun)|\u0648 (Wau)|\u0647\u0640 (Ha)|\u0621 (Hamzah)|\u064A (Ya)", pertanyaan_cek: "", aktif: true },
  // H. IQRA — JILID 1 SAMPAI JILID 6
  { kode_item: "IQR-1A", bidang: "Hijaiyah_Iqra", level_track: "Iqra 1", kategori: "Iqra", label_kelompok: "Fathah Awal (Hal. 1-7)", isi_item: "\u0627\u064E (A)|\u0628\u064E (Ba)|\u062A\u064E (Ta)|\u062B\u064E (Tsa)|\u062C\u064E (Ja)|\u062D\u064E (Ha)|\u062E\u064E (Kha)", pertanyaan_cek: "", aktif: true },
  { kode_item: "IQR-1B", bidang: "Hijaiyah_Iqra", level_track: "Iqra 1", kategori: "Iqra", label_kelompok: "Fathah Tengah 1 (Hal. 8-15)", isi_item: "\u062F\u064E (Da)|\u0630\u064E (Dza)|\u0631\u064E (Ra)|\u0632\u064E (Za)|\u0633\u064E (Sa)|\u0634\u064E (Sya)|\u0635\u064E (Sha)|\u0636\u064E (Dha)", pertanyaan_cek: "", aktif: true },
  { kode_item: "IQR-1C", bidang: "Hijaiyah_Iqra", level_track: "Iqra 1", kategori: "Iqra", label_kelompok: "Fathah Tengah 2 (Hal. 16-23)", isi_item: "\u0637\u064E (Tha)|\u0638\u064E (Zha)|\u0639\u064E ('A)|\u063A\u064E (Gha)|\u0641\u064E (Fa)|\u0642\u064E (Qa)|\u0643\u064E (Ka)|\u0644\u064E (La)", pertanyaan_cek: "", aktif: true },
  { kode_item: "IQR-1D", bidang: "Hijaiyah_Iqra", level_track: "Iqra 1", kategori: "Iqra", label_kelompok: "Fathah Akhir & EBTA (Hal. 24-32)", isi_item: "\u0645\u064E (Ma)|\u0646\u064E (Na)|\u0648\u064E (Wa)|\u0647\u064E\u0640 (Ha)|\u0621\u064E (A)|\u064A\u064E (Ya)|Latihan 3 Huruf Acak|EBTA Iqra 1", pertanyaan_cek: "", aktif: true },
  { kode_item: "IQR-2A", bidang: "Hijaiyah_Iqra", level_track: "Iqra 2", kategori: "Iqra", label_kelompok: "Huruf Sambung Awal-Tengah-Akhir (Hal. 1-14)", isi_item: "Sambung 2 Huruf (\u0628\u064E\u062A\u064E)|Sambung 3 Huruf (\u062C\u064E\u0644\u064E\u0633\u064E)|Sambung 3 Huruf (\u0643\u064E\u062A\u064E\u0628\u064E)|Latihan Sambung Fathah", pertanyaan_cek: "", aktif: true },
  { kode_item: "IQR-2B", bidang: "Hijaiyah_Iqra", level_track: "Iqra 2", kategori: "Iqra", label_kelompok: "Mad Thabi'i Alif (Hal. 15-24)", isi_item: "Panjang Alif 2 Harakat (\u0628\u064E\u0627)|Pembedaan Pendek-Panjang (\u062A\u064E\u0627 / \u062A\u064E)|Bacaan Sambung Mad (\u0642\u064E\u0627\u0644\u064E)", pertanyaan_cek: "", aktif: true },
  { kode_item: "IQR-2C", bidang: "Hijaiyah_Iqra", level_track: "Iqra 2", kategori: "Iqra", label_kelompok: "Fathah Tegak & Evaluasi (Hal. 25-30)", isi_item: "Fathah Tegak|Campuran Panjang-Pendek|EBTA Iqra 2", pertanyaan_cek: "", aktif: true },
  { kode_item: "IQR-3A", bidang: "Hijaiyah_Iqra", level_track: "Iqra 3", kategori: "Iqra", label_kelompok: "Harakat Kasrah & Mad Ya (Hal. 1-13)", isi_item: "Bunyi Kasrah (\u0628\u0650 \u062A\u0650 \u062B\u0650)|Mad Ya 2 Harakat (\u0641\u0650\u064A / \u0642\u0650\u064A\u0644\u064E)|Campuran Fathah-Kasrah", pertanyaan_cek: "", aktif: true },
  { kode_item: "IQR-3B", bidang: "Hijaiyah_Iqra", level_track: "Iqra 3", kategori: "Iqra", label_kelompok: "Harakat Dhammah & Mad Wau (Hal. 14-23)", isi_item: "Bunyi Dhammah (\u0628\u064F \u062A\u064F \u062B\u064F)|Mad Wau 2 Harakat (\u064A\u064E\u0642\u064F\u0648\u0644\u064F / \u0646\u064F\u0648\u0631\u064F)|Campuran 3 Harakat", pertanyaan_cek: "", aktif: true },
  { kode_item: "IQR-3C", bidang: "Hijaiyah_Iqra", level_track: "Iqra 3", kategori: "Iqra", label_kelompok: "Evaluasi Jilid 3 (Hal. 24-30)", isi_item: "Kelancaran Fathah-Kasrah-Dhammah|Panjang-Pendek 3 Harakat|EBTA Iqra 3", pertanyaan_cek: "", aktif: true },
  { kode_item: "IQR-4A", bidang: "Hijaiyah_Iqra", level_track: "Iqra 4", kategori: "Iqra", label_kelompok: "Tanda Tanwin", isi_item: "Fathatain (\u0628\u064B\u0627 - an)|Kasratain (\u0628\u064D - in)|Dhammatain (\u0628\u064C - un)", pertanyaan_cek: "", aktif: true },
  { kode_item: "IQR-4B", bidang: "Hijaiyah_Iqra", level_track: "Iqra 4", kategori: "Iqra", label_kelompok: "Huruf Sukun Dasar", isi_item: "Ya/Wau Lin (\u0623\u064E\u0648\u0652 / \u0623\u064E\u064A\u0652)|Mim Sukun (\u0639\u064E\u0644\u064E\u064A\u0652\u0647\u0650\u0645\u0652)|Nun Sukun Dasar (\u0623\u064E\u0646\u0652\u0639\u064E\u0645\u0652\u062A\u064E)", pertanyaan_cek: "", aktif: true },
  { kode_item: "IQR-4C", bidang: "Hijaiyah_Iqra", level_track: "Iqra 4", kategori: "Iqra", label_kelompok: "Qalqalah & Evaluasi Jilid 4", isi_item: "Qalqalah (\u0628 \u062C \u062F \u0637 \u0642 sukun)|Latihan Sukun Campuran|EBTA Iqra 4", pertanyaan_cek: "", aktif: true },
  { kode_item: "IQR-5A", bidang: "Hijaiyah_Iqra", level_track: "Iqra 5", kategori: "Iqra", label_kelompok: "Alif Lam & Waqaf", isi_item: "Alif Lam Qamariyah (\u0627\u064E\u0644\u0652\u062D\u064E\u0645\u0652\u062F\u064F)|Alif Lam Syamsiyah (\u0627\u064E\u0644\u0634\u064E\u0651\u0645\u0652\u0633\u064F)|Cara Waqaf Akhir Kata", pertanyaan_cek: "", aktif: true },
  { kode_item: "IQR-5B", bidang: "Hijaiyah_Iqra", level_track: "Iqra 5", kategori: "Iqra", label_kelompok: "Tasydid & Ghunnah", isi_item: "Huruf Bertanda Tasydid|Ghunnah Nun & Mim Tasydid (\u0625\u0650\u0646\u064E\u0651 / \u062B\u064F\u0645\u064E\u0651)", pertanyaan_cek: "", aktif: true },
  { kode_item: "IQR-5C", bidang: "Hijaiyah_Iqra", level_track: "Iqra 5", kategori: "Iqra", label_kelompok: "Idgham, Lafzul Jalalah & Mad", isi_item: "Idgham Bighunnah/Bilaghunnah|Lafzul Jalalah (\u0627\u0644\u0644\u0651\u0670\u0647)|Mad Wajib & Jaiz 4-5 Harakat|EBTA Iqra 5", pertanyaan_cek: "", aktif: true },
  { kode_item: "IQR-6A", bidang: "Hijaiyah_Iqra", level_track: "Iqra 6", kategori: "Iqra", label_kelompok: "Hukum Nun Sukun & Tanwin", isi_item: "Idgham|Iqlab|Ikhfa Haqiqi", pertanyaan_cek: "", aktif: true },
  { kode_item: "IQR-6B", bidang: "Hijaiyah_Iqra", level_track: "Iqra 6", kategori: "Iqra", label_kelompok: "Tanda Waqaf & Huruf Muqatha'ah", isi_item: "Tanda Waqaf Al-Qur'an|Huruf Muqatha'ah (\u0627\u0644\u0645 / \u064A\u0633 / \u062D\u0645)", pertanyaan_cek: "", aktif: true },
  { kode_item: "IQR-6C", bidang: "Hijaiyah_Iqra", level_track: "Iqra 6", kategori: "Iqra", label_kelompok: "Latihan Ayat & EBTA Jilid 6", isi_item: "Rangkaian Ayat Pendek|Evaluasi Tajwid Dasar|EBTA Iqra 6 (Siap Al-Qur'an)", pertanyaan_cek: "", aktif: true }
];

// src/data/masterAtp.ts
var MASTER_ATP_SEED = [
  // ================= BAGIAN A: KELOMPOK A (84 INDIKATOR) =================
  // Elemen 1: Nilai Agama & Budi Pekerti (24)
  { atp_uid: "A-NABP.1.1", kelompok: "Kelompok A", semester_target: "Semester 1 & 2", elemen: "Nilai Agama & Budi Pekerti", kode_atp: "NABP.1.1", tujuan_pembelajaran: "Murid menyebutkan nama Tuhan sebagai pencipta dirinya dan benda-benda ciptaan Tuhan di lingkungan sekitar.", aktif: true },
  { atp_uid: "A-NABP.1.2", kelompok: "Kelompok A", semester_target: "Semester 1 & 2", elemen: "Nilai Agama & Budi Pekerti", kode_atp: "NABP.1.2", tujuan_pembelajaran: "Murid mengenal nama agamanya dan tempat ibadah atau kegiatan keagamaan yang biasa dilakukan di keluarga.", aktif: true },
  { atp_uid: "A-NABP.1.3", kelompok: "Kelompok A", semester_target: "Semester 1 & 2", elemen: "Nilai Agama & Budi Pekerti", kode_atp: "NABP.1.3", tujuan_pembelajaran: "Murid mengenal simbol-simbol dan atribut sederhana yang berkaitan dengan agamanya.", aktif: true },
  { atp_uid: "A-NABP.1.4", kelompok: "Kelompok A", semester_target: "Semester 1 & 2", elemen: "Nilai Agama & Budi Pekerti", kode_atp: "NABP.1.4", tujuan_pembelajaran: "Murid meniru ucapan doa harian sederhana (sebelum/sesudah makan, belajar) dan gerakan ibadah dengan contoh pendidik.", aktif: true },
  { atp_uid: "A-NABP.1.5", kelompok: "Kelompok A", semester_target: "Semester 1 & 2", elemen: "Nilai Agama & Budi Pekerti", kode_atp: "NABP.1.5", tujuan_pembelajaran: "Murid terbiasa mengucapkan doa harian sebelum dan sesudah melakukan kegiatan sehari-hari.", aktif: true },
  { atp_uid: "A-NABP.1.6", kelompok: "Kelompok A", semester_target: "Semester 1 & 2", elemen: "Nilai Agama & Budi Pekerti", kode_atp: "NABP.1.6", tujuan_pembelajaran: "Murid menunjukkan perilaku kasih sayang kepada sesama sebagai wujud pengenalan ajaran agamanya.", aktif: true },
  { atp_uid: "A-NABP.2.1", kelompok: "Kelompok A", semester_target: "Semester 1", elemen: "Nilai Agama & Budi Pekerti", kode_atp: "NABP.2.1", tujuan_pembelajaran: "Murid membedakan kondisi tubuh atau tangan saat bersih dan kotor.", aktif: true },
  { atp_uid: "A-NABP.2.2", kelompok: "Kelompok A", semester_target: "Semester 1", elemen: "Nilai Agama & Budi Pekerti", kode_atp: "NABP.2.2", tujuan_pembelajaran: "Murid mempraktikkan cara mencuci tangan dengan sabun dan menggosok gigi dengan bimbingan pendidik.", aktif: true },
  { atp_uid: "A-NABP.2.3", kelompok: "Kelompok A", semester_target: "Semester 1", elemen: "Nilai Agama & Budi Pekerti", kode_atp: "NABP.2.3", tujuan_pembelajaran: "Murid mengenal makanan dan minuman sehat yang baik untuk pertumbuhan tubuhnya.", aktif: true },
  { atp_uid: "A-NABP.2.4", kelompok: "Kelompok A", semester_target: "Semester 1", elemen: "Nilai Agama & Budi Pekerti", kode_atp: "NABP.2.4", tujuan_pembelajaran: "Murid menceritakan cara merawat tubuh (seperti makan buah/sayur dan tidur siang/istirahat).", aktif: true },
  { atp_uid: "A-NABP.2.5", kelompok: "Kelompok A", semester_target: "Semester 2", elemen: "Nilai Agama & Budi Pekerti", kode_atp: "NABP.2.5", tujuan_pembelajaran: "Murid mengenali situasi, benda tajam/panas, atau tempat yang membahayakan keselamatan dirinya.", aktif: true },
  { atp_uid: "A-NABP.2.6", kelompok: "Kelompok A", semester_target: "Semester 2", elemen: "Nilai Agama & Budi Pekerti", kode_atp: "NABP.2.6", tujuan_pembelajaran: "Murid bersedia menghindari benda/situasi berbahaya dengan arahan pendidik sebagai wujud rasa syukur atas tubuhnya.", aktif: true },
  { atp_uid: "A-NABP.3.1", kelompok: "Kelompok A", semester_target: "Semester 1", elemen: "Nilai Agama & Budi Pekerti", kode_atp: "NABP.3.1", tujuan_pembelajaran: "Murid mengamati dan menyebutkan perbedaan fisik sederhana (seperti bentuk rambut atau tinggi badan) antara dirinya dan teman.", aktif: true },
  { atp_uid: "A-NABP.3.2", kelompok: "Kelompok A", semester_target: "Semester 1", elemen: "Nilai Agama & Budi Pekerti", kode_atp: "NABP.3.2", tujuan_pembelajaran: "Murid mau bersikap ramah dan bermain bersama teman yang memiliki perbedaan fisik atau latar belakang.", aktif: true },
  { atp_uid: "A-NABP.3.3", kelompok: "Kelompok A", semester_target: "Semester 1", elemen: "Nilai Agama & Budi Pekerti", kode_atp: "NABP.3.3", tujuan_pembelajaran: "Murid meniru ucapan 4 kata santun (maaf, tolong, terima kasih, permisi) dalam interaksi sehari-hari.", aktif: true },
  { atp_uid: "A-NABP.3.4", kelompok: "Kelompok A", semester_target: "Semester 2", elemen: "Nilai Agama & Budi Pekerti", kode_atp: "NABP.3.4", tujuan_pembelajaran: "Murid terbiasa mengucapkan terima kasih saat menerima bantuan dan meminta maaf saat bersalah.", aktif: true },
  { atp_uid: "A-NABP.3.5", kelompok: "Kelompok A", semester_target: "Semester 2", elemen: "Nilai Agama & Budi Pekerti", kode_atp: "NABP.3.5", tujuan_pembelajaran: "Murid menunjukkan sikap mau berbagi benda atau membantu teman yang mengalami kesulitan ringan.", aktif: true },
  { atp_uid: "A-NABP.3.6", kelompok: "Kelompok A", semester_target: "Semester 2", elemen: "Nilai Agama & Budi Pekerti", kode_atp: "NABP.3.6", tujuan_pembelajaran: "Murid mendengarkan ketika teman atau pendidik sedang berbicara di kelas.", aktif: true },
  { atp_uid: "A-NABP.4.1", kelompok: "Kelompok A", semester_target: "Semester 1", elemen: "Nilai Agama & Budi Pekerti", kode_atp: "NABP.4.1", tujuan_pembelajaran: "Murid mengenal tanaman dan hewan peliharaan sebagai sesama makhluk ciptaan Tuhan YME.", aktif: true },
  { atp_uid: "A-NABP.4.2", kelompok: "Kelompok A", semester_target: "Semester 2", elemen: "Nilai Agama & Budi Pekerti", kode_atp: "NABP.4.2", tujuan_pembelajaran: "Murid menceritakan cara sederhana menyayangi hewan dan tidak merusak tanaman.", aktif: true },
  { atp_uid: "A-NABP.4.3", kelompok: "Kelompok A", semester_target: "Semester 1", elemen: "Nilai Agama & Budi Pekerti", kode_atp: "NABP.4.3", tujuan_pembelajaran: "Murid mempraktikkan kegiatan menyiram tanaman dan memberi makan hewan peliharaan bersama teman/pendidik.", aktif: true },
  { atp_uid: "A-NABP.4.4", kelompok: "Kelompok A", semester_target: "Semester 2", elemen: "Nilai Agama & Budi Pekerti", kode_atp: "NABP.4.4", tujuan_pembelajaran: "Murid terbiasa membuang sampah pada tempatnya setelah selesai makan atau berkegiatan.", aktif: true },
  { atp_uid: "A-NABP.4.5", kelompok: "Kelompok A", semester_target: "Semester 2", elemen: "Nilai Agama & Budi Pekerti", kode_atp: "NABP.4.5", tujuan_pembelajaran: "Murid mengenali kondisi lingkungan yang bersih dan yang kotor/berantakan.", aktif: true },
  { atp_uid: "A-NABP.4.6", kelompok: "Kelompok A", semester_target: "Semester 2", elemen: "Nilai Agama & Budi Pekerti", kode_atp: "NABP.4.6", tujuan_pembelajaran: "Murid ikut serta dalam kegiatan merapikan dan menjaga kebersihan lingkungan kelasnya.", aktif: true },
  // Elemen 2: Jati Diri (30)
  { atp_uid: "A-JD.1.1", kelompok: "Kelompok A", semester_target: "Semester 1", elemen: "Jati Diri", kode_atp: "JD.1.1", tujuan_pembelajaran: "Murid menyebutkan nama panggilan, usia, jenis kelamin, dan ciri fisik dirinya secara sederhana.", aktif: true },
  { atp_uid: "A-JD.1.2", kelompok: "Kelompok A", semester_target: "Semester 1", elemen: "Jati Diri", kode_atp: "JD.1.2", tujuan_pembelajaran: "Murid mengenal anggota keluarga intinya (ayah, ibu, kakak/adik) dan panggilan dalam keluarganya.", aktif: true },
  { atp_uid: "A-JD.1.3", kelompok: "Kelompok A", semester_target: "Semester 1", elemen: "Jati Diri", kode_atp: "JD.1.3", tujuan_pembelajaran: "Murid menunjukkan dan menyebutkan mainan atau warna yang disukainya.", aktif: true },
  { atp_uid: "A-JD.1.4", kelompok: "Kelompok A", semester_target: "Semester 1", elemen: "Jati Diri", kode_atp: "JD.1.4", tujuan_pembelajaran: "Murid menyampaikan kebutuhan fisiknya secara langsung (seperti haus, lapar, mau ke toilet).", aktif: true },
  { atp_uid: "A-JD.1.5", kelompok: "Kelompok A", semester_target: "Semester 1", elemen: "Jati Diri", kode_atp: "JD.1.5", tujuan_pembelajaran: "Murid mengenali bahwa dirinya dan temannya memiliki kesukaan atau mainan favorit yang berbeda.", aktif: true },
  { atp_uid: "A-JD.1.6", kelompok: "Kelompok A", semester_target: "Semester 1", elemen: "Jati Diri", kode_atp: "JD.1.6", tujuan_pembelajaran: "Murid memilih kegiatan bermain yang ingin dilakukannya dari beberapa pilihan yang disediakan.", aktif: true },
  { atp_uid: "A-JD.2.1", kelompok: "Kelompok A", semester_target: "Semester 1", elemen: "Jati Diri", kode_atp: "JD.2.1", tujuan_pembelajaran: "Murid menceritakan kegiatan atau kebiasaan rutin yang dilakukan di rumahnya bersama keluarga.", aktif: true },
  { atp_uid: "A-JD.2.2", kelompok: "Kelompok A", semester_target: "Semester 1", elemen: "Jati Diri", kode_atp: "JD.2.2", tujuan_pembelajaran: "Murid mengenali urutan kegiatan harian di sekolah (penyambutan, jurnal pagi, bermain, makan, penutup).", aktif: true },
  { atp_uid: "A-JD.2.3", kelompok: "Kelompok A", semester_target: "Semester 1", elemen: "Jati Diri", kode_atp: "JD.2.3", tujuan_pembelajaran: "Murid mengikuti pembiasaan baik di sekolah (melepas sepatu, menaruh tas di tempatnya).", aktif: true },
  { atp_uid: "A-JD.2.4", kelompok: "Kelompok A", semester_target: "Semester 2", elemen: "Jati Diri", kode_atp: "JD.2.4", tujuan_pembelajaran: "Murid mencoba antre dan menunggu giliran saat bermain perosotan atau menggunakan fasilitas sekolah.", aktif: true },
  { atp_uid: "A-JD.2.5", kelompok: "Kelompok A", semester_target: "Semester 2", elemen: "Jati Diri", kode_atp: "JD.2.5", tujuan_pembelajaran: "Murid membedakan perilaku yang boleh dan tidak boleh dilakukan di dalam kelas.", aktif: true },
  { atp_uid: "A-JD.2.6", kelompok: "Kelompok A", semester_target: "Semester 2", elemen: "Jati Diri", kode_atp: "JD.2.6", tujuan_pembelajaran: "Murid merapikan kembali mainan ke tempat semula setelah selesai digunakan.", aktif: true },
  { atp_uid: "A-JD.3.1", kelompok: "Kelompok A", semester_target: "Semester 1", elemen: "Jati Diri", kode_atp: "JD.3.1", tujuan_pembelajaran: "Murid mengenali dan menyebutkan emosi dasar yang sedang dirasakannya (senang, sedih, marah, takut).", aktif: true },
  { atp_uid: "A-JD.3.2", kelompok: "Kelompok A", semester_target: "Semester 1", elemen: "Jati Diri", kode_atp: "JD.3.2", tujuan_pembelajaran: "Murid mengekspresikan emosi melalui wajah, kata-kata, atau tindakan yang aman bagi dirinya dan orang lain.", aktif: true },
  { atp_uid: "A-JD.3.3", kelompok: "Kelompok A", semester_target: "Semester 1", elemen: "Jati Diri", kode_atp: "JD.3.3", tujuan_pembelajaran: "Murid mau ditenangkan oleh pendidik saat merasa sedih, kecewa, atau marah.", aktif: true },
  { atp_uid: "A-JD.3.4", kelompok: "Kelompok A", semester_target: "Semester 2", elemen: "Jati Diri", kode_atp: "JD.3.4", tujuan_pembelajaran: "Murid melakukan kontak mata dan merespon ajakan teman untuk bermain bersama.", aktif: true },
  { atp_uid: "A-JD.3.5", kelompok: "Kelompok A", semester_target: "Semester 2", elemen: "Jati Diri", kode_atp: "JD.3.5", tujuan_pembelajaran: "Murid mau bergantian menggunakan alat main bersama teman tanpa berebut.", aktif: true },
  { atp_uid: "A-JD.3.6", kelompok: "Kelompok A", semester_target: "Semester 2", elemen: "Jati Diri", kode_atp: "JD.3.6", tujuan_pembelajaran: "Murid mencoba mengatasi rasa tidak nyaman dengan meminta bantuan pendidik atau menggunakan kata-kata sederhana.", aktif: true },
  { atp_uid: "A-JD.4.1", kelompok: "Kelompok A", semester_target: "Semester 1", elemen: "Jati Diri", kode_atp: "JD.4.1", tujuan_pembelajaran: "Murid memahami bahwa dirinya adalah anak di rumah dan murid di sekolah.", aktif: true },
  { atp_uid: "A-JD.4.2", kelompok: "Kelompok A", semester_target: "Semester 1", elemen: "Jati Diri", kode_atp: "JD.4.2", tujuan_pembelajaran: "Murid mengenali dan menjalankan aturan kelas sederhana (seperti berbicara bergantian).", aktif: true },
  { atp_uid: "A-JD.4.3", kelompok: "Kelompok A", semester_target: "Semester 1", elemen: "Jati Diri", kode_atp: "JD.4.3", tujuan_pembelajaran: "Murid membedakan cara bersikap saat berada di kelas, taman bermain, dan perpustakaan.", aktif: true },
  { atp_uid: "A-JD.4.4", kelompok: "Kelompok A", semester_target: "Semester 1", elemen: "Jati Diri", kode_atp: "JD.4.4", tujuan_pembelajaran: "Murid mengenali warna bendera negara Indonesia (Merah Putih).", aktif: true },
  { atp_uid: "A-JD.4.5", kelompok: "Kelompok A", semester_target: "Semester 2", elemen: "Jati Diri", kode_atp: "JD.4.5", tujuan_pembelajaran: "Murid berdiri tertib saat menyanyikan lagu kebangsaan atau penghormatan bendera.", aktif: true },
  { atp_uid: "A-JD.4.6", kelompok: "Kelompok A", semester_target: "Semester 2", elemen: "Jati Diri", kode_atp: "JD.4.6", tujuan_pembelajaran: "Murid mengenal bahwa ada anak-anak lain di daerah atau tempat yang berbeda melalui gambar/buku cerita.", aktif: true },
  { atp_uid: "A-JD.5.1", kelompok: "Kelompok A", semester_target: "Semester 1", elemen: "Jati Diri", kode_atp: "JD.5.1", tujuan_pembelajaran: "Murid melakukan gerakan motorik kasar dasar (berjalan di garis lurus, berlari, melompat dengan dua kaki).", aktif: true },
  { atp_uid: "A-JD.5.2", kelompok: "Kelompok A", semester_target: "Semester 1", elemen: "Jati Diri", kode_atp: "JD.5.2", tujuan_pembelajaran: "Murid menirukan gerakan binatang atau olahraga sederhana untuk melatih keseimbangan tubuh.", aktif: true },
  { atp_uid: "A-JD.5.3", kelompok: "Kelompok A", semester_target: "Semester 1", elemen: "Jati Diri", kode_atp: "JD.5.3", tujuan_pembelajaran: "Murid meraba dan meremas berbagai tekstur (halus, kasar, basah, kering, pasir, busa) dengan indera peraba.", aktif: true },
  { atp_uid: "A-JD.5.4", kelompok: "Kelompok A", semester_target: "Semester 2", elemen: "Jati Diri", kode_atp: "JD.5.4", tujuan_pembelajaran: "Murid melakukan gerakan motorik halus dasar (meremas kertas, merobek, meronce manik-manik besar, memegang krayon).", aktif: true },
  { atp_uid: "A-JD.5.5", kelompok: "Kelompok A", semester_target: "Semester 2", elemen: "Jati Diri", kode_atp: "JD.5.5", tujuan_pembelajaran: "Murid mempraktikkan keterampilan bina diri dasar (memakai kaus kaki, melepas sepatu, makan sendiri).", aktif: true },
  { atp_uid: "A-JD.5.6", kelompok: "Kelompok A", semester_target: "Semester 2", elemen: "Jati Diri", kode_atp: "JD.5.6", tujuan_pembelajaran: "Murid mengoordinasikan tangan dan mata untuk menggunting garis lurus pendek atau menempel gambar.", aktif: true },
  // Elemen 3: Literasi & STEAM (LMSTRS) (30)
  { atp_uid: "A-LMSTRS.1.1", kelompok: "Kelompok A", semester_target: "Semester 1", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.1.1", tujuan_pembelajaran: "Murid menyimak dan mendengarkan ketika pendidik membaca buku cerita atau memberikan arahan lisan.", aktif: true },
  { atp_uid: "A-LMSTRS.1.2", kelompok: "Kelompok A", semester_target: "Semester 1", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.1.2", tujuan_pembelajaran: 'Murid melaksanakan instruksi sederhana 1\u20132 langkah (seperti: "ambil tasmu lalu duduk di karpet").', aktif: true },
  { atp_uid: "A-LMSTRS.1.3", kelompok: "Kelompok A", semester_target: "Semester 1", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.1.3", tujuan_pembelajaran: "Murid menjawab pertanyaan sederhana tentang pengalaman atau cerita yang baru didengarkan.", aktif: true },
  { atp_uid: "A-LMSTRS.1.4", kelompok: "Kelompok A", semester_target: "Semester 2", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.1.4", tujuan_pembelajaran: "Murid menunjukkan minat pada buku dengan membalik-balik halaman dan mengamati gambar.", aktif: true },
  { atp_uid: "A-LMSTRS.1.5", kelompok: "Kelompok A", semester_target: "Semester 2", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.1.5", tujuan_pembelajaran: "Murid menceritakan kembali isi gambar pada buku cerita menggunakan bahasanya sendiri.", aktif: true },
  { atp_uid: "A-LMSTRS.1.6", kelompok: "Kelompok A", semester_target: "Semester 2", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.1.6", tujuan_pembelajaran: "Murid mencoret bebas, meniru bentuk garis/simbol, atau mencoba meniru tulisan huruf awal namanya.", aktif: true },
  { atp_uid: "A-LMSTRS.2.1", kelompok: "Kelompok A", semester_target: "Semester 1", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.2.1", tujuan_pembelajaran: "Murid membilang secara berurutan angka 1 sampai 10 (rote counting).", aktif: true },
  { atp_uid: "A-LMSTRS.2.2", kelompok: "Kelompok A", semester_target: "Semester 1", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.2.2", tujuan_pembelajaran: "Murid menghitung jumlah benda konkret 1 sampai 5 dengan menunjuk satu per satu (korespondensi 1-ke-1).", aktif: true },
  { atp_uid: "A-LMSTRS.2.3", kelompok: "Kelompok A", semester_target: "Semester 1", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.2.3", tujuan_pembelajaran: 'Murid membedakan kelompok benda yang jumlahnya "banyak" dan "sedikit" secara visual.', aktif: true },
  { atp_uid: "A-LMSTRS.2.4", kelompok: "Kelompok A", semester_target: "Semester 2", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.2.4", tujuan_pembelajaran: "Murid mengenali dan menyebutkan bentuk geometri dasar 2D (lingkaran, segitiga, persegi).", aktif: true },
  { atp_uid: "A-LMSTRS.2.5", kelompok: "Kelompok A", semester_target: "Semester 2", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.2.5", tujuan_pembelajaran: "Murid membedakan posisi benda sederhana (atas-bawah, dalam-luar, depan-belakang).", aktif: true },
  { atp_uid: "A-LMSTRS.2.6", kelompok: "Kelompok A", semester_target: "Semester 2", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.2.6", tujuan_pembelajaran: "Murid membandingkan dua benda berdasarkan ukuran (besar-kecil, panjang-pendek) dan mengenal urutan waktu (pagi, siang, malam).", aktif: true },
  { atp_uid: "A-LMSTRS.3.1", kelompok: "Kelompok A", semester_target: "Semester 1", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.3.1", tujuan_pembelajaran: "Murid mengamati benda, tanaman, atau hewan di sekitar menggunakan inderanya.", aktif: true },
  { atp_uid: "A-LMSTRS.3.2", kelompok: "Kelompok A", semester_target: "Semester 1", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.3.2", tujuan_pembelajaran: 'Murid mengenali hubungan sebab-akibat langsung sederhana (seperti: "kalau air tumpah, meja jadi basah").', aktif: true },
  { atp_uid: "A-LMSTRS.3.3", kelompok: "Kelompok A", semester_target: "Semester 1", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.3.3", tujuan_pembelajaran: "Murid mengutarakan alasan sederhana mengapa ia memilih suatu mainan atau makanan.", aktif: true },
  { atp_uid: "A-LMSTRS.3.4", kelompok: "Kelompok A", semester_target: "Semester 2", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.3.4", tujuan_pembelajaran: "Murid mencoba menyelesaikan masalah kecil saat bermain (seperti menumpuk balok agar tidak roboh).", aktif: true },
  { atp_uid: "A-LMSTRS.3.5", kelompok: "Kelompok A", semester_target: "Semester 2", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.3.5", tujuan_pembelajaran: 'Murid menunjukkan rasa ingin tahu dengan bertanya "apa ini?" atau "mengapa begitu?".', aktif: true },
  { atp_uid: "A-LMSTRS.3.6", kelompok: "Kelompok A", semester_target: "Semester 2", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.3.6", tujuan_pembelajaran: "Murid melakukan pencampuran warna atau percobaan sederhana (terapung-tenggelam) dengan bimbingan.", aktif: true },
  { atp_uid: "A-LMSTRS.4.1", kelompok: "Kelompok A", semester_target: "Semester 1", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.4.1", tujuan_pembelajaran: "Murid mengenali nama dan fungsi alat/teknologi sederhana sehari-hari (sendok, garpu, gunting tumpul, krayon, sapu).", aktif: true },
  { atp_uid: "A-LMSTRS.4.2", kelompok: "Kelompok A", semester_target: "Semester 1", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.4.2", tujuan_pembelajaran: "Murid mencoba menggunakan alat sederhana (sendok saat makan, kuas saat melukis) sesuai fungsinya.", aktif: true },
  { atp_uid: "A-LMSTRS.4.3", kelompok: "Kelompok A", semester_target: "Semester 1", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.4.3", tujuan_pembelajaran: "Murid membawa dan memegang alat sederhana (seperti gunting tumpul) dengan cara yang aman.", aktif: true },
  { atp_uid: "A-LMSTRS.4.4", kelompok: "Kelompok A", semester_target: "Semester 2", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.4.4", tujuan_pembelajaran: "Murid menyusun atau menggabungkan bahan loose parts / kardus bekas menjadi suatu bentuk kreasi.", aktif: true },
  { atp_uid: "A-LMSTRS.4.5", kelompok: "Kelompok A", semester_target: "Semester 2", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.4.5", tujuan_pembelajaran: "Murid mengamati tayangan gambar/video edukatif sederhana dengan pendampingan pendidik.", aktif: true },
  { atp_uid: "A-LMSTRS.4.6", kelompok: "Kelompok A", semester_target: "Semester 2", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.4.6", tujuan_pembelajaran: "Murid mematikan kran air atau merapikan kembali alat yang telah selesai digunakan.", aktif: true },
  { atp_uid: "A-LMSTRS.5.1", kelompok: "Kelompok A", semester_target: "Semester 1", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.5.1", tujuan_pembelajaran: "Murid mengeksplorasi berbagai media seni visual (krayon, cat jari/finger painting, playdough, bahan alam).", aktif: true },
  { atp_uid: "A-LMSTRS.5.2", kelompok: "Kelompok A", semester_target: "Semester 1", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.5.2", tujuan_pembelajaran: "Murid mendengarkan musik, menyanyikan lagu anak-anak sederhana, dan menepuk irama.", aktif: true },
  { atp_uid: "A-LMSTRS.5.3", kelompok: "Kelompok A", semester_target: "Semester 1", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.5.3", tujuan_pembelajaran: "Murid menggerakkan tubuh mengikuti irama musik atau menirukan gerakan tarian sederhana.", aktif: true },
  { atp_uid: "A-LMSTRS.5.4", kelompok: "Kelompok A", semester_target: "Semester 2", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.5.4", tujuan_pembelajaran: "Murid mengekspresikan gagasannya melalui gambar coretan, bentuk cetakan, atau bangunan balok.", aktif: true },
  { atp_uid: "A-LMSTRS.5.5", kelompok: "Kelompok A", semester_target: "Semester 2", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.5.5", tujuan_pembelajaran: "Murid bermain peran sederhana (seperti berpura-pura menjadi dokter, koki, atau penjual).", aktif: true },
  { atp_uid: "A-LMSTRS.5.6", kelompok: "Kelompok A", semester_target: "Semester 2", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.5.6", tujuan_pembelajaran: "Murid menunjukkan rasa senang dan memberikan tepuk tangan/pujian atas hasil karya dirinya dan teman.", aktif: true },
  // ================= BAGIAN B: KELOMPOK B (84 INDIKATOR) =================
  // Elemen 1: Nilai Agama & Budi Pekerti (24)
  { atp_uid: "B-NABP.1.1", kelompok: "Kelompok B", semester_target: "Semester 1 & 2", elemen: "Nilai Agama & Budi Pekerti", kode_atp: "NABP.1.1", tujuan_pembelajaran: "Murid mengenal nama Tuhan YME sebagai pencipta dirinya, makhluk hidup lain, dan alam semesta.", aktif: true },
  { atp_uid: "B-NABP.1.2", kelompok: "Kelompok B", semester_target: "Semester 1 & 2", elemen: "Nilai Agama & Budi Pekerti", kode_atp: "NABP.1.2", tujuan_pembelajaran: "Murid mengenal nama agama, hari besar keagamaan, dan tempat ibadah sesuai agama/kepercayaannya.", aktif: true },
  { atp_uid: "B-NABP.1.3", kelompok: "Kelompok B", semester_target: "Semester 1 & 2", elemen: "Nilai Agama & Budi Pekerti", kode_atp: "NABP.1.3", tujuan_pembelajaran: "Murid membedakan simbol, atribut, dan kitab suci yang berkaitan dengan agama yang dianutnya.", aktif: true },
  { atp_uid: "B-NABP.1.4", kelompok: "Kelompok B", semester_target: "Semester 1 & 2", elemen: "Nilai Agama & Budi Pekerti", kode_atp: "NABP.1.4", tujuan_pembelajaran: "Murid meniru ucapan doa harian dan gerakan ibadah dengan bimbingan pendidik (scaffolding).", aktif: true },
  { atp_uid: "B-NABP.1.5", kelompok: "Kelompok B", semester_target: "Semester 1 & 2", elemen: "Nilai Agama & Budi Pekerti", kode_atp: "NABP.1.5", tujuan_pembelajaran: "Murid mempraktikkan kegiatan ibadah harian dan doa sebelum/sesudah berkegiatan secara mandiri.", aktif: true },
  { atp_uid: "B-NABP.1.6", kelompok: "Kelompok B", semester_target: "Semester 1 & 2", elemen: "Nilai Agama & Budi Pekerti", kode_atp: "NABP.1.6", tujuan_pembelajaran: "Murid menerapkan nilai-nilai ajaran agama dalam interaksi dan perilaku bermain sehari-hari.", aktif: true },
  { atp_uid: "B-NABP.2.1", kelompok: "Kelompok B", semester_target: "Semester 1", elemen: "Nilai Agama & Budi Pekerti", kode_atp: "NABP.2.1", tujuan_pembelajaran: "Murid mengenali kondisi tubuhnya saat bersih dan kotor serta memahami pentingnya bina diri.", aktif: true },
  { atp_uid: "B-NABP.2.2", kelompok: "Kelompok B", semester_target: "Semester 1", elemen: "Nilai Agama & Budi Pekerti", kode_atp: "NABP.2.2", tujuan_pembelajaran: "Murid menerapkan kebiasaan hidup bersih (cuci tangan, sikat gigi, toilet training) secara mandiri.", aktif: true },
  { atp_uid: "B-NABP.2.3", kelompok: "Kelompok B", semester_target: "Semester 1", elemen: "Nilai Agama & Budi Pekerti", kode_atp: "NABP.2.3", tujuan_pembelajaran: "Murid mengenali ciri-ciri tubuh sehat dan memilih makanan/minuman bergizi seimbang.", aktif: true },
  { atp_uid: "B-NABP.2.4", kelompok: "Kelompok B", semester_target: "Semester 1", elemen: "Nilai Agama & Budi Pekerti", kode_atp: "NABP.2.4", tujuan_pembelajaran: "Murid menerapkan kebiasaan merawat kesehatan tubuh, olahraga, dan istirahat yang cukup.", aktif: true },
  { atp_uid: "B-NABP.2.5", kelompok: "Kelompok B", semester_target: "Semester 2", elemen: "Nilai Agama & Budi Pekerti", kode_atp: "NABP.2.5", tujuan_pembelajaran: "Murid mengidentifikasi benda, situasi, dan perilaku yang membahayakan keselamatan dirinya.", aktif: true },
  { atp_uid: "B-NABP.2.6", kelompok: "Kelompok B", semester_target: "Semester 2", elemen: "Nilai Agama & Budi Pekerti", kode_atp: "NABP.2.6", tujuan_pembelajaran: "Murid menerapkan tindakan pencegahan bahaya keselamatan diri dan merefleksikan rasa syukur atas karunia tubuh dari Tuhan YME.", aktif: true },
  { atp_uid: "B-NABP.3.1", kelompok: "Kelompok B", semester_target: "Semester 1", elemen: "Nilai Agama & Budi Pekerti", kode_atp: "NABP.3.1", tujuan_pembelajaran: "Murid mengenali persamaan dan perbedaan ciri fisik maupun non-fisik antara dirinya dengan orang lain.", aktif: true },
  { atp_uid: "B-NABP.3.2", kelompok: "Kelompok B", semester_target: "Semester 1", elemen: "Nilai Agama & Budi Pekerti", kode_atp: "NABP.3.2", tujuan_pembelajaran: "Murid menunjukkan sikap menerima dan menghormati keberagaman sesama manusia tanpa membeda-bedakan.", aktif: true },
  { atp_uid: "B-NABP.3.3", kelompok: "Kelompok B", semester_target: "Semester 1", elemen: "Nilai Agama & Budi Pekerti", kode_atp: "NABP.3.3", tujuan_pembelajaran: "Murid mengenali dan meniru penggunaan kata-kata santun (maaf, tolong, terima kasih, permisi).", aktif: true },
  { atp_uid: "B-NABP.3.4", kelompok: "Kelompok B", semester_target: "Semester 2", elemen: "Nilai Agama & Budi Pekerti", kode_atp: "NABP.3.4", tujuan_pembelajaran: "Murid terbiasa bertutur kata halus, bersikap jujur, dan mendengarkan pendapat teman yang berbeda.", aktif: true },
  { atp_uid: "B-NABP.3.5", kelompok: "Kelompok B", semester_target: "Semester 2", elemen: "Nilai Agama & Budi Pekerti", kode_atp: "NABP.3.5", tujuan_pembelajaran: "Murid menunjukkan sikap empati (bela rasa) dengan membantu teman yang membutuhkan bantuan.", aktif: true },
  { atp_uid: "B-NABP.3.6", kelompok: "Kelompok B", semester_target: "Semester 2", elemen: "Nilai Agama & Budi Pekerti", kode_atp: "NABP.3.6", tujuan_pembelajaran: "Murid merefleksikan pentingnya berperilaku baik dan berakhlak mulia untuk menciptakan keharmonisan.", aktif: true },
  { atp_uid: "B-NABP.4.1", kelompok: "Kelompok B", semester_target: "Semester 1", elemen: "Nilai Agama & Budi Pekerti", kode_atp: "NABP.4.1", tujuan_pembelajaran: "Murid mengenal konsep alam sekitar, tanaman, dan hewan sebagai makhluk hidup ciptaan Tuhan YME.", aktif: true },
  { atp_uid: "B-NABP.4.2", kelompok: "Kelompok B", semester_target: "Semester 2", elemen: "Nilai Agama & Budi Pekerti", kode_atp: "NABP.4.2", tujuan_pembelajaran: "Murid menjelaskan cara merawat tanaman dan menyayangi hewan di lingkungan sekitarnya.", aktif: true },
  { atp_uid: "B-NABP.4.3", kelompok: "Kelompok B", semester_target: "Semester 2", elemen: "Nilai Agama & Budi Pekerti", kode_atp: "NABP.4.3", tujuan_pembelajaran: "Murid mempraktikkan kegiatan menyiram tanaman dan memberi makan hewan secara teratur.", aktif: true },
  { atp_uid: "B-NABP.4.4", kelompok: "Kelompok B", semester_target: "Semester 1", elemen: "Nilai Agama & Budi Pekerti", kode_atp: "NABP.4.4", tujuan_pembelajaran: "Murid mempraktikkan kebiasaan membuang sampah pada tempatnya dan memelihara kebersihan lingkungan.", aktif: true },
  { atp_uid: "B-NABP.4.5", kelompok: "Kelompok B", semester_target: "Semester 2", elemen: "Nilai Agama & Budi Pekerti", kode_atp: "NABP.4.5", tujuan_pembelajaran: "Murid mengamati dampak dari kerusakan lingkungan alam dan cara sederhana untuk mencegahnya.", aktif: true },
  { atp_uid: "B-NABP.4.6", kelompok: "Kelompok B", semester_target: "Semester 2", elemen: "Nilai Agama & Budi Pekerti", kode_atp: "NABP.4.6", tujuan_pembelajaran: "Murid merefleksikan pentingnya merawat seluruh makhluk hidup dan menjaga kelestarian alam ciptaan Tuhan YME.", aktif: true },
  // Elemen 2: Jati Diri (30)
  { atp_uid: "B-JD.1.1", kelompok: "Kelompok B", semester_target: "Semester 1", elemen: "Jati Diri", kode_atp: "JD.1.1", tujuan_pembelajaran: "Murid menyebutkan identitas diri dasar (nama lengkap, nama panggilan, usia, gender, ciri fisik).", aktif: true },
  { atp_uid: "B-JD.1.2", kelompok: "Kelompok B", semester_target: "Semester 1", elemen: "Jati Diri", kode_atp: "JD.1.2", tujuan_pembelajaran: "Murid menceritakan asal-usul keluarga, latar belakang agama, dan sosial budaya daerahnya secara sederhana.", aktif: true },
  { atp_uid: "B-JD.1.3", kelompok: "Kelompok B", semester_target: "Semester 1", elemen: "Jati Diri", kode_atp: "JD.1.3", tujuan_pembelajaran: "Murid mengidentifikasi minat, kesukaan, dan hobi yang dimilikinya saat berkegiatan.", aktif: true },
  { atp_uid: "B-JD.1.4", kelompok: "Kelompok B", semester_target: "Semester 1", elemen: "Jati Diri", kode_atp: "JD.1.4", tujuan_pembelajaran: "Murid mengomunikasikan kebutuhan pribadi baik fisik maupun emosionalnya secara jelas.", aktif: true },
  { atp_uid: "B-JD.1.5", kelompok: "Kelompok B", semester_target: "Semester 1", elemen: "Jati Diri", kode_atp: "JD.1.5", tujuan_pembelajaran: "Murid menghubungkan keunikan identitas dan minat dirinya dengan keberagaman teman di kelas.", aktif: true },
  { atp_uid: "B-JD.1.6", kelompok: "Kelompok B", semester_target: "Semester 1", elemen: "Jati Diri", kode_atp: "JD.1.6", tujuan_pembelajaran: "Murid merefleksikan minat dan kebutuhannya untuk memilih serta mengambil keputusan sederhana.", aktif: true },
  { atp_uid: "B-JD.2.1", kelompok: "Kelompok B", semester_target: "Semester 1", elemen: "Jati Diri", kode_atp: "JD.2.1", tujuan_pembelajaran: "Murid menjelaskan rutinitas harian dan pembiasaan positif di lingkungan rumah/keluarganya.", aktif: true },
  { atp_uid: "B-JD.2.2", kelompok: "Kelompok B", semester_target: "Semester 1", elemen: "Jati Diri", kode_atp: "JD.2.2", tujuan_pembelajaran: "Murid mengenali dan mengikuti tata tertib serta pembiasaan harian di satuan PAUD.", aktif: true },
  { atp_uid: "B-JD.2.3", kelompok: "Kelompok B", semester_target: "Semester 1", elemen: "Jati Diri", kode_atp: "JD.2.3", tujuan_pembelajaran: "Murid membedakan kebiasaan yang berlaku di lingkungan keluarga, sekolah, dan masyarakat.", aktif: true },
  { atp_uid: "B-JD.2.4", kelompok: "Kelompok B", semester_target: "Semester 2", elemen: "Jati Diri", kode_atp: "JD.2.4", tujuan_pembelajaran: "Murid menerapkan kebiasaan sopan santun dan budaya antre/bergiliran dalam berkegiatan.", aktif: true },
  { atp_uid: "B-JD.2.5", kelompok: "Kelompok B", semester_target: "Semester 2", elemen: "Jati Diri", kode_atp: "JD.2.5", tujuan_pembelajaran: "Murid menghubungkan kebiasaan baik di keluarga/sekolah dengan nilai-nilai kebaikan di masyarakat.", aktif: true },
  { atp_uid: "B-JD.2.6", kelompok: "Kelompok B", semester_target: "Semester 2", elemen: "Jati Diri", kode_atp: "JD.2.6", tujuan_pembelajaran: "Murid merefleksikan pentingnya menjaga kebiasaan positif di berbagai lingkungan untuk kebaikan bersama.", aktif: true },
  { atp_uid: "B-JD.3.1", kelompok: "Kelompok B", semester_target: "Semester 1", elemen: "Jati Diri", kode_atp: "JD.3.1", tujuan_pembelajaran: "Murid mengenali dan membedakan ragam emosi dasar (senang, sedih, marah, takut, gelisah).", aktif: true },
  { atp_uid: "B-JD.3.2", kelompok: "Kelompok B", semester_target: "Semester 1", elemen: "Jati Diri", kode_atp: "JD.3.2", tujuan_pembelajaran: "Murid mengekspresikan emosi secara wajar dan menceritakan penyebab emosi yang dirasakannya.", aktif: true },
  { atp_uid: "B-JD.3.3", kelompok: "Kelompok B", semester_target: "Semester 1", elemen: "Jati Diri", kode_atp: "JD.3.3", tujuan_pembelajaran: "Murid memilih dan menerapkan strategi regulasi emosi sederhana (tarik napas, menenangkan diri).", aktif: true },
  { atp_uid: "B-JD.3.4", kelompok: "Kelompok B", semester_target: "Semester 2", elemen: "Jati Diri", kode_atp: "JD.3.4", tujuan_pembelajaran: "Murid melakukan interaksi sosial positif dengan teman dan pendidik saat bermain bersama.", aktif: true },
  { atp_uid: "B-JD.3.5", kelompok: "Kelompok B", semester_target: "Semester 2", elemen: "Jati Diri", kode_atp: "JD.3.5", tujuan_pembelajaran: "Murid terbiasa berbagi, bergiliran, dan menyelesaikan konflik ringan dengan kata-kata yang baik.", aktif: true },
  { atp_uid: "B-JD.3.6", kelompok: "Kelompok B", semester_target: "Semester 2", elemen: "Jati Diri", kode_atp: "JD.3.6", tujuan_pembelajaran: "Murid berkolaborasi dalam tugas kelompok serta merefleksikan pentingnya hubungan sosial yang sehat.", aktif: true },
  { atp_uid: "B-JD.4.1", kelompok: "Kelompok B", semester_target: "Semester 1", elemen: "Jati Diri", kode_atp: "JD.4.1", tujuan_pembelajaran: "Murid memahami perannya sebagai anak di rumah serta sebagai murid dan teman di sekolah.", aktif: true },
  { atp_uid: "B-JD.4.2", kelompok: "Kelompok B", semester_target: "Semester 1", elemen: "Jati Diri", kode_atp: "JD.4.2", tujuan_pembelajaran: "Murid mengenali, menyepakati, dan mematuhi aturan/kesepakatan kelas yang dibuat bersama.", aktif: true },
  { atp_uid: "B-JD.4.3", kelompok: "Kelompok B", semester_target: "Semester 1", elemen: "Jati Diri", kode_atp: "JD.4.3", tujuan_pembelajaran: "Murid membedakan norma dan tata krama yang berlaku di berbagai tempat berbeda.", aktif: true },
  { atp_uid: "B-JD.4.4", kelompok: "Kelompok B", semester_target: "Semester 1", elemen: "Jati Diri", kode_atp: "JD.4.4", tujuan_pembelajaran: "Murid mengenal simbol-simbol kebangsaan Indonesia (Bendera Merah Putih, Garuda Pancasila, Lagu Indonesia Raya).", aktif: true },
  { atp_uid: "B-JD.4.5", kelompok: "Kelompok B", semester_target: "Semester 2", elemen: "Jati Diri", kode_atp: "JD.4.5", tujuan_pembelajaran: "Murid mengenal keberadaan negara lain, budaya, dan bahasa yang berbeda di dunia.", aktif: true },
  { atp_uid: "B-JD.4.6", kelompok: "Kelompok B", semester_target: "Semester 2", elemen: "Jati Diri", kode_atp: "JD.4.6", tujuan_pembelajaran: "Murid merefleksikan kesadaran bahwa dirinya merupakan bagian dari warga negara Indonesia dan warga dunia.", aktif: true },
  { atp_uid: "B-JD.5.1", kelompok: "Kelompok B", semester_target: "Semester 1", elemen: "Jati Diri", kode_atp: "JD.5.1", tujuan_pembelajaran: "Murid melakukan gerakan motorik kasar dasar (berlari, melompat, melempar, memanjat) dengan lancar.", aktif: true },
  { atp_uid: "B-JD.5.2", kelompok: "Kelompok B", semester_target: "Semester 1", elemen: "Jati Diri", kode_atp: "JD.5.2", tujuan_pembelajaran: "Murid mengontrol gerakan tubuh yang melibatkan kekuatan, keseimbangan, dan koordinasi fisik.", aktif: true },
  { atp_uid: "B-JD.5.3", kelompok: "Kelompok B", semester_target: "Semester 1", elemen: "Jati Diri", kode_atp: "JD.5.3", tujuan_pembelajaran: "Murid mengeksplorasi ragam tekstur (halus, kasar, basah, kering, lengket) melalui indera perabaan (taktil).", aktif: true },
  { atp_uid: "B-JD.5.4", kelompok: "Kelompok B", semester_target: "Semester 2", elemen: "Jati Diri", kode_atp: "JD.5.4", tujuan_pembelajaran: "Murid melakukan gerakan motorik halus presisi (menggunting, meronce, melipat, memegang alat tulis).", aktif: true },
  { atp_uid: "B-JD.5.5", kelompok: "Kelompok B", semester_target: "Semester 2", elemen: "Jati Diri", kode_atp: "JD.5.5", tujuan_pembelajaran: "Murid mempraktikkan keterampilan bina diri mandiri (memakai sepatu, mengancingkan baju, merapikan alat main).", aktif: true },
  { atp_uid: "B-JD.5.6", kelompok: "Kelompok B", semester_target: "Semester 2", elemen: "Jati Diri", kode_atp: "JD.5.6", tujuan_pembelajaran: "Murid mengoordinasikan fungsi gerak tubuh secara optimal untuk mendukung kemandirian berkegiatan.", aktif: true },
  // Elemen 3: Literasi & STEAM (LMSTRS) (30)
  { atp_uid: "B-LMSTRS.1.1", kelompok: "Kelompok B", semester_target: "Semester 1", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.1.1", tujuan_pembelajaran: "Murid mengenali dan menyimak informasi lisan serta melaksanakan instruksi majemuk (2\u20133 langkah).", aktif: true },
  { atp_uid: "B-LMSTRS.1.2", kelompok: "Kelompok B", semester_target: "Semester 1", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.1.2", tujuan_pembelajaran: "Murid mengomunikasikan perasaan, pikiran, dan pengalamannya secara lisan menggunakan kalimat terstruktur.", aktif: true },
  { atp_uid: "B-LMSTRS.1.3", kelompok: "Kelompok B", semester_target: "Semester 1", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.1.3", tujuan_pembelajaran: "Murid merespon dan membangun percakapan dua arah secara aktif, santun, dan bergantian.", aktif: true },
  { atp_uid: "B-LMSTRS.1.4", kelompok: "Kelompok B", semester_target: "Semester 2", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.1.4", tujuan_pembelajaran: "Murid menunjukkan minat dan partisipasi aktif dalam kegiatan membaca nyaring (read aloud) dan mengeksplorasi buku.", aktif: true },
  { atp_uid: "B-LMSTRS.1.5", kelompok: "Kelompok B", semester_target: "Semester 2", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.1.5", tujuan_pembelajaran: "Murid memahami makna simbol/cetakan dan mengidentifikasi bunyi huruf awal kata (kesadaran fonemik).", aktif: true },
  { atp_uid: "B-LMSTRS.1.6", kelompok: "Kelompok B", semester_target: "Semester 2", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.1.6", tujuan_pembelajaran: "Murid menunjukkan kemampuan pramenulis melalui coretan bermakna, meniru bentuk huruf, dan menulis nama diri.", aktif: true },
  { atp_uid: "B-LMSTRS.2.1", kelompok: "Kelompok B", semester_target: "Semester 1", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.2.1", tujuan_pembelajaran: "Murid membilang berurutan (1\u201320) dan menunjukkan kepekaan bilangan (korespondensi satu-satu & subitasi).", aktif: true },
  { atp_uid: "B-LMSTRS.2.2", kelompok: "Kelompok B", semester_target: "Semester 1 & 2", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.2.2", tujuan_pembelajaran: "Murid memahami konsep penggabungan (penjumlahan) dan pemisahan (pengurangan) benda konkret.", aktif: true },
  { atp_uid: "B-LMSTRS.2.3", kelompok: "Kelompok B", semester_target: "Semester 1", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.2.3", tujuan_pembelajaran: "Murid mengidentifikasi, melanjutkan, dan menciptakan pola berulang sederhana (A-B-A-B atau A-B-C).", aktif: true },
  { atp_uid: "B-LMSTRS.2.4", kelompok: "Kelompok B", semester_target: "Semester 2", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.2.4", tujuan_pembelajaran: "Murid mengenali dan membedakan bentuk geometri 2D (lingkaran, segitiga, persegi) dan 3D (kubus, bola, tabung).", aktif: true },
  { atp_uid: "B-LMSTRS.2.5", kelompok: "Kelompok B", semester_target: "Semester 2", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.2.5", tujuan_pembelajaran: "Murid mengidentifikasi konsep posisi/spasial (atas, bawah, dalam, luar, depan, belakang) dan arah.", aktif: true },
  { atp_uid: "B-LMSTRS.2.6", kelompok: "Kelompok B", semester_target: "Semester 2", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.2.6", tujuan_pembelajaran: "Murid mengukur benda dengan satuan tidak baku (jengkal, balok) serta mengenali konsep waktu (pagi/siang/malam, hari).", aktif: true },
  { atp_uid: "B-LMSTRS.3.1", kelompok: "Kelompok B", semester_target: "Semester 1", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.3.1", tujuan_pembelajaran: "Murid mengamati fenomena alam dan sosial di sekitarnya serta menyebutkan ciri-cirinya.", aktif: true },
  { atp_uid: "B-LMSTRS.3.2", kelompok: "Kelompok B", semester_target: "Semester 1", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.3.2", tujuan_pembelajaran: "Murid memahami dan menjelaskan hubungan sebab-akibat sederhana dari suatu kondisi/peristiwa.", aktif: true },
  { atp_uid: "B-LMSTRS.3.3", kelompok: "Kelompok B", semester_target: "Semester 1", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.3.3", tujuan_pembelajaran: "Murid menyampaikan alasan logis di balik pilihan, keputusan, atau tindakan yang diambilnya.", aktif: true },
  { atp_uid: "B-LMSTRS.3.4", kelompok: "Kelompok B", semester_target: "Semester 2", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.3.4", tujuan_pembelajaran: "Murid menemukan alternatif solusi untuk memecahkan masalah sederhana saat bermain.", aktif: true },
  { atp_uid: "B-LMSTRS.3.5", kelompok: "Kelompok B", semester_target: "Semester 2", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.3.5", tujuan_pembelajaran: "Murid menunjukkan rasa ingin tahu tinggi dengan aktif mengajukan pertanyaan tentang hal baru.", aktif: true },
  { atp_uid: "B-LMSTRS.3.6", kelompok: "Kelompok B", semester_target: "Semester 2", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.3.6", tujuan_pembelajaran: "Murid terlibat aktif dalam eksplorasi dan eksperimen sains sederhana (campur warna, terapung-tenggelam).", aktif: true },
  { atp_uid: "B-LMSTRS.4.1", kelompok: "Kelompok B", semester_target: "Semester 1", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.4.1", tujuan_pembelajaran: "Murid memahami fungsi alat/teknologi sederhana harian (gunting, sendok, sapu, kuas, krayon).", aktif: true },
  { atp_uid: "B-LMSTRS.4.2", kelompok: "Kelompok B", semester_target: "Semester 1", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.4.2", tujuan_pembelajaran: "Murid menggunakan teknologi sederhana dalam kehidupan harian secara aman dan bertanggung jawab.", aktif: true },
  { atp_uid: "B-LMSTRS.4.3", kelompok: "Kelompok B", semester_target: "Semester 1", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.4.3", tujuan_pembelajaran: "Murid menggunakan dan memodifikasi alat/bahan di sekitar untuk menyelesaikan masalah praktis.", aktif: true },
  { atp_uid: "B-LMSTRS.4.4", kelompok: "Kelompok B", semester_target: "Semester 2", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.4.4", tujuan_pembelajaran: "Murid merancang dan merekayasa karya dari bahan bekas/loose parts secara kreatif.", aktif: true },
  { atp_uid: "B-LMSTRS.4.5", kelompok: "Kelompok B", semester_target: "Semester 2", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.4.5", tujuan_pembelajaran: "Murid memanfaatkan media teknologi/digital (dengan pendampingan) untuk mencari informasi positif.", aktif: true },
  { atp_uid: "B-LMSTRS.4.6", kelompok: "Kelompok B", semester_target: "Semester 2", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.4.6", tujuan_pembelajaran: "Murid merefleksikan pentingnya penggunaan teknologi secara bijak dan merawat alat setelah digunakan.", aktif: true },
  { atp_uid: "B-LMSTRS.5.1", kelompok: "Kelompok B", semester_target: "Semester 1", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.5.1", tujuan_pembelajaran: "Murid mengeksplorasi berbagai media dan alat seni (cat air, krayon, bahan alam, alat musik buatan).", aktif: true },
  { atp_uid: "B-LMSTRS.5.2", kelompok: "Kelompok B", semester_target: "Semester 1", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.5.2", tujuan_pembelajaran: "Murid mengeksplorasi ragam proses seni (seni rupa, musik, olah vokal, gerak tari, dan drama/peran).", aktif: true },
  { atp_uid: "B-LMSTRS.5.3", kelompok: "Kelompok B", semester_target: "Semester 1", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.5.3", tujuan_pembelajaran: "Murid mengekspresikan imajinasi, ide, dan perasaannya secara bebas melalui karya seni visual.", aktif: true },
  { atp_uid: "B-LMSTRS.5.4", kelompok: "Kelompok B", semester_target: "Semester 2", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.5.4", tujuan_pembelajaran: "Murid mengekspresikan diri melalui olah tubuh/gerakan tari dan memainkan irama musik sederhana.", aktif: true },
  { atp_uid: "B-LMSTRS.5.5", kelompok: "Kelompok B", semester_target: "Semester 2", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.5.5", tujuan_pembelajaran: "Murid membuat karya seni orisinal hasil kreasi sendiri dari gabungan berbagai media.", aktif: true },
  { atp_uid: "B-LMSTRS.5.6", kelompok: "Kelompok B", semester_target: "Semester 2", elemen: "Literasi & STEAM", kode_atp: "LMSTRS.5.6", tujuan_pembelajaran: "Murid memberikan respon positif dan mengapresiasi hasil karya seni milik sendiri maupun teman sebayanya.", aktif: true }
];

// src/data/seedDatabase.ts
function createInitialSeedDatabase() {
  return {
    pengaturanSekolah: {
      nama_sekolah: "TK IT AL-WASHLIYAH",
      npsn: "69991416",
      alamat_sekolah: "Jl. Gunung Mangga, Kel. Sukamajukaler, Kec. Indihiang, Kota Tasikmalaya, Jawa Barat",
      kontak_sekolah: "tkislamterpadualwashliyah@gmail.com \xB7 (0265) 331-842",
      kepala_sekolah: "Obi Abdulah Sapari",
      tahun_ajaran_aktif: "2026/2027",
      semester_aktif: "Semester 1",
      folder_drive_id: "FOLDER_DRIVE_TK_IT_AL_WASHLIYAH",
      gas_webapp_url: "",
      admin_claimed: false
    },
    users: [
      {
        user_id: "USR-GRU-A1",
        username: "gurua",
        password_hash: "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4",
        // sha256('1234')
        role: "Guru",
        nama_lengkap: "Ustadzah Siti Rahmawati, S.Pd",
        no_hp: "0813-2201-8890",
        kelas_ampu: "Kelas A",
        status_aktif: true
      },
      {
        user_id: "USR-GRU-B1",
        username: "gurub",
        password_hash: "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4",
        // sha256('1234')
        role: "Guru",
        nama_lengkap: "Ustadzah Nurul Hidayah, S.Pd.I",
        no_hp: "0852-9102-3341",
        kelas_ampu: "Kelas B",
        status_aktif: true
      },
      {
        user_id: "USR-ORT-01",
        username: "bunda_ali",
        password_hash: "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4",
        // sha256('1234')
        role: "OrangTua",
        nama_lengkap: "Bunda Aisyah (Wali Ali & Zahra)",
        no_hp: "0812-8871-9012",
        kelas_ampu: "",
        status_aktif: true
      },
      {
        user_id: "USR-ORT-02",
        username: "ayah_hasan",
        password_hash: "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4",
        // sha256('1234')
        role: "OrangTua",
        nama_lengkap: "Ayah Ridwan (Wali Hasan)",
        no_hp: "0821-7761-4430",
        kelas_ampu: "",
        status_aktif: true
      }
    ],
    tahunAjaran: [
      {
        ta_id: "TA-2025-2026",
        nama_ta: "2025/2026",
        tanggal_mulai: "2025-07-14",
        tanggal_selesai: "2026-06-20",
        status_aktif: false
      },
      {
        ta_id: "TA-2026-2027",
        nama_ta: "2026/2027",
        tanggal_mulai: "2026-07-13",
        tanggal_selesai: "2027-06-19",
        status_aktif: true
      }
    ],
    siswa: [
      {
        siswa_id: "SIS-001",
        nis: "26270101",
        nama_anak: "Muhammad Ali Al-Fatih",
        jenis_kelamin: "L",
        tanggal_lahir: "2022-05-14",
        ortu_user_id: "USR-ORT-01",
        kelas_aktif: "Kelas A",
        status_siswa: "Aktif",
        target_literasi_kelas_b: "TRACK_1",
        target_kustom_kelas_b: ""
      },
      {
        siswa_id: "SIS-002",
        nis: "25260204",
        nama_anak: "Zahra Humaira Putri",
        jenis_kelamin: "P",
        tanggal_lahir: "2021-03-22",
        ortu_user_id: "USR-ORT-01",
        kelas_aktif: "Kelas B",
        status_siswa: "Aktif",
        target_literasi_kelas_b: "TRACK_3",
        target_kustom_kelas_b: ""
      },
      {
        siswa_id: "SIS-003",
        nis: "25260208",
        nama_anak: "Hasan Abdurrahman",
        jenis_kelamin: "L",
        tanggal_lahir: "2021-06-09",
        ortu_user_id: "USR-ORT-02",
        kelas_aktif: "Kelas B",
        status_siswa: "Aktif",
        target_literasi_kelas_b: "TRACK_2",
        target_kustom_kelas_b: ""
      },
      {
        siswa_id: "SIS-004",
        nis: "26270105",
        nama_anak: "Khansa Nabila",
        jenis_kelamin: "P",
        tanggal_lahir: "2022-08-19",
        ortu_user_id: "USR-ORT-02",
        kelas_aktif: "Kelas A",
        status_siswa: "Aktif",
        target_literasi_kelas_b: "TRACK_1",
        target_kustom_kelas_b: ""
      }
    ],
    riwayatKelas: [
      {
        riwayat_id: "RWY-001",
        siswa_id: "SIS-001",
        ta_id: "TA-2026-2027",
        nama_ta: "2026/2027",
        kelas: "Kelas A",
        wali_kelas_id: "USR-GRU-A1",
        status_akhir: "Berjalan"
      },
      {
        riwayat_id: "RWY-002",
        siswa_id: "SIS-002",
        ta_id: "TA-2025-2026",
        nama_ta: "2025/2026",
        kelas: "Kelas A",
        wali_kelas_id: "USR-GRU-A1",
        status_akhir: "Naik Kelas"
      },
      {
        riwayat_id: "RWY-003",
        siswa_id: "SIS-002",
        ta_id: "TA-2026-2027",
        nama_ta: "2026/2027",
        kelas: "Kelas B",
        wali_kelas_id: "USR-GRU-B1",
        status_akhir: "Berjalan"
      },
      {
        riwayat_id: "RWY-004",
        siswa_id: "SIS-003",
        ta_id: "TA-2025-2026",
        nama_ta: "2025/2026",
        kelas: "Kelas A",
        wali_kelas_id: "USR-GRU-A1",
        status_akhir: "Naik Kelas"
      },
      {
        riwayat_id: "RWY-005",
        siswa_id: "SIS-003",
        ta_id: "TA-2026-2027",
        nama_ta: "2026/2027",
        kelas: "Kelas B",
        wali_kelas_id: "USR-GRU-B1",
        status_akhir: "Berjalan"
      },
      {
        riwayat_id: "RWY-006",
        siswa_id: "SIS-004",
        ta_id: "TA-2026-2027",
        nama_ta: "2026/2027",
        kelas: "Kelas A",
        wali_kelas_id: "USR-GRU-A1",
        status_akhir: "Berjalan"
      }
    ],
    antropometri: [
      {
        log_id: "ANT-001",
        siswa_id: "SIS-001",
        ta_id: "TA-2026-2027",
        periode_bulan: "2026-09",
        usia_bulan: 52,
        bb_kg: 16,
        tb_cm: 103.5,
        lk_cm: 49.8,
        lila_cm: 16.2,
        status_gizi_otomatis: "Normal",
        kode_pemicu_tips: "ANTRO_NORMAL",
        catatan_guru: "Nafsu makan baik saat makan bekal pagi.",
        updated_at: "2026-09-15T09:00:00Z"
      },
      {
        log_id: "ANT-002",
        siswa_id: "SIS-001",
        ta_id: "TA-2026-2027",
        periode_bulan: "2026-10",
        usia_bulan: 53,
        bb_kg: 16.3,
        tb_cm: 104.2,
        lk_cm: 49.9,
        lila_cm: 16.4,
        status_gizi_otomatis: "Normal",
        kode_pemicu_tips: "ANTRO_NORMAL",
        catatan_guru: "Pertumbuhan berat dan tinggi badan naik stabil.",
        updated_at: "2026-10-15T09:00:00Z"
      },
      {
        log_id: "ANT-003",
        siswa_id: "SIS-001",
        ta_id: "TA-2026-2027",
        periode_bulan: "2026-11",
        usia_bulan: 54,
        bb_kg: 16.6,
        tb_cm: 104.8,
        lk_cm: 50,
        lila_cm: 16.5,
        status_gizi_otomatis: "Normal",
        kode_pemicu_tips: "ANTRO_NORMAL",
        catatan_guru: "Aktif berlari di sentra motorik dan selalu menghabiskan bekal buah.",
        updated_at: "2026-11-12T09:00:00Z"
      },
      {
        log_id: "ANT-004",
        siswa_id: "SIS-002",
        ta_id: "TA-2026-2027",
        periode_bulan: "2026-09",
        usia_bulan: 66,
        bb_kg: 18.4,
        tb_cm: 111,
        lk_cm: 50.5,
        lila_cm: 16.9,
        status_gizi_otomatis: "Normal",
        kode_pemicu_tips: "ANTRO_NORMAL",
        catatan_guru: "Postur proporsional dan lincah.",
        updated_at: "2026-09-15T09:00:00Z"
      },
      {
        log_id: "ANT-005",
        siswa_id: "SIS-002",
        ta_id: "TA-2026-2027",
        periode_bulan: "2026-10",
        usia_bulan: 67,
        bb_kg: 18.7,
        tb_cm: 111.6,
        lk_cm: 50.6,
        lila_cm: 17,
        status_gizi_otomatis: "Normal",
        kode_pemicu_tips: "ANTRO_NORMAL",
        catatan_guru: "Sehat dan ceria.",
        updated_at: "2026-10-15T09:00:00Z"
      },
      {
        log_id: "ANT-006",
        siswa_id: "SIS-002",
        ta_id: "TA-2026-2027",
        periode_bulan: "2026-11",
        usia_bulan: 68,
        bb_kg: 19,
        tb_cm: 112.2,
        lk_cm: 50.7,
        lila_cm: 17.1,
        status_gizi_otomatis: "Normal",
        kode_pemicu_tips: "ANTRO_NORMAL",
        catatan_guru: "Tumbuh kembang sangat baik di bulan November.",
        updated_at: "2026-11-12T09:00:00Z"
      },
      {
        log_id: "ANT-007",
        siswa_id: "SIS-003",
        ta_id: "TA-2026-2027",
        periode_bulan: "2026-10",
        usia_bulan: 64,
        bb_kg: 15.2,
        tb_cm: 108,
        lk_cm: 49.5,
        lila_cm: 14.8,
        status_gizi_otomatis: "BB Kurang",
        kode_pemicu_tips: "ANTRO_BB_KURANG",
        catatan_guru: "Bekal makan siang sering bersisa setengah.",
        updated_at: "2026-10-15T09:00:00Z"
      },
      {
        log_id: "ANT-008",
        siswa_id: "SIS-003",
        ta_id: "TA-2026-2027",
        periode_bulan: "2026-11",
        usia_bulan: 65,
        bb_kg: 15.2,
        tb_cm: 108.2,
        lk_cm: 49.5,
        lila_cm: 14.8,
        status_gizi_otomatis: "BB Kurang",
        kode_pemicu_tips: "ANTRO_TREN_STAGNAN",
        catatan_guru: "Berat badan mendatar dibanding bulan lalu, perlu variasi bekal protein.",
        updated_at: "2026-11-12T09:00:00Z"
      }
    ],
    literasi: [
      {
        lit_id: "LIT-001",
        siswa_id: "SIS-001",
        ta_id: "TA-2026-2027",
        periode_bulan: "2026-11",
        kelas: "Kelas A",
        track_level_dipilih: "STANDAR_A",
        target_kustom: "",
        nilai_huruf_atau_dasar: "Berkembang Sesuai Harapan (BSH)",
        nilai_sukukata_atau_lanjutan: "Mulai Berkembang (MB)",
        nilai_kalimat_opsional: "",
        catatan_guru: "Ali sudah mengenal hampir semua huruf vokal & konsonan dasar, sedang berlatih suku kata ba-bi-bu.",
        updated_at: "2026-11-20T10:00:00Z"
      },
      {
        lit_id: "LIT-002",
        siswa_id: "SIS-002",
        ta_id: "TA-2026-2027",
        periode_bulan: "2026-11",
        kelas: "Kelas B",
        track_level_dipilih: "TRACK_3",
        target_kustom: "",
        nilai_huruf_atau_dasar: "Berkembang Sangat Baik (BSB)",
        nilai_sukukata_atau_lanjutan: "Berkembang Sesuai Harapan (BSH)",
        nilai_kalimat_opsional: "Berkembang Sesuai Harapan (BSH)",
        catatan_guru: "Zahra lancar membaca kalimat pendek 3\u20134 kata dan mulai antusias membaca buku cerita bergambar.",
        updated_at: "2026-11-20T10:00:00Z"
      },
      {
        lit_id: "LIT-003",
        siswa_id: "SIS-003",
        ta_id: "TA-2026-2027",
        periode_bulan: "2026-11",
        kelas: "Kelas B",
        track_level_dipilih: "TRACK_2",
        target_kustom: "",
        nilai_huruf_atau_dasar: "Berkembang Sesuai Harapan (BSH)",
        nilai_sukukata_atau_lanjutan: "Mulai Berkembang (MB)",
        nilai_kalimat_opsional: "",
        catatan_guru: "Hasan menguasai suku kata terbuka, sedang menguatkan akhiran konsonan -n dan -m.",
        updated_at: "2026-11-20T10:00:00Z"
      }
    ],
    keagamaan: [
      {
        agama_id: "AGM-001",
        siswa_id: "SIS-001",
        ta_id: "TA-2026-2027",
        periode_bulan: "2026-11",
        kategori: "Surat Pendek",
        materi_id: "SRT-04",
        nama_materi: "QS. Al-Ikhlas",
        status_progres: "Hafal/Lancar dengan Bantuan",
        catatan_guru: "Semangat menghafal ayat 1-4 saat murojaah pagi.",
        updated_at: "2026-11-18T08:30:00Z"
      },
      {
        agama_id: "AGM-002",
        siswa_id: "SIS-001",
        ta_id: "TA-2026-2027",
        periode_bulan: "2026-11",
        kategori: "Hijaiyah / Iqra",
        materi_id: "IQR-02",
        nama_materi: "Iqra Jilid 1 (Harakat Fathah)",
        status_progres: "Menirukan",
        catatan_guru: "Iqra 1 Hal. 7, perlu pengulangan huruf \u062C\u064E dan \u062E\u064E.",
        updated_at: "2026-11-18T08:35:00Z"
      },
      {
        agama_id: "AGM-003",
        siswa_id: "SIS-002",
        ta_id: "TA-2026-2027",
        periode_bulan: "2026-11",
        kategori: "Surat Pendek",
        materi_id: "SRT-08",
        nama_materi: "QS. Al-Kautsar",
        status_progres: "Hafal/Lancar Mandiri",
        catatan_guru: "Bacaan jelas dan tartil.",
        updated_at: "2026-11-19T08:30:00Z"
      },
      {
        agama_id: "AGM-004",
        siswa_id: "SIS-002",
        ta_id: "TA-2026-2027",
        periode_bulan: "2026-11",
        kategori: "Hijaiyah / Iqra",
        materi_id: "IQR-04",
        nama_materi: "Iqra Jilid 3 (Kasrah, Dhammah & Mad)",
        status_progres: "Hafal/Lancar dengan Bantuan",
        catatan_guru: "Iqra 3 Hal. 14, membedakan harakat kasrah dan dhammah dengan baik.",
        updated_at: "2026-11-19T08:35:00Z"
      },
      {
        agama_id: "AGM-005",
        siswa_id: "SIS-002",
        ta_id: "TA-2026-2027",
        periode_bulan: "2026-11",
        kategori: "Doa Harian",
        materi_id: "DOA-04",
        nama_materi: "Doa Untuk Kedua Orang Tua",
        status_progres: "Hafal/Lancar Mandiri",
        catatan_guru: "Selalu membaca sebelum pulang.",
        updated_at: "2026-11-19T08:40:00Z"
      },
      {
        agama_id: "AGM-006",
        siswa_id: "SIS-002",
        ta_id: "TA-2026-2027",
        periode_bulan: "2026-11",
        kategori: "Hadits Pendek",
        materi_id: "HDT-02",
        nama_materi: "Hadits Senyum adalah Sedekah",
        status_progres: "Hafal/Lancar Mandiri",
        catatan_guru: "Suka mempraktikkan senyum salam sapa kepada teman.",
        updated_at: "2026-11-19T08:45:00Z"
      }
    ],
    kaihHarian: [
      {
        kaih_harian_id: "KAIH-20261123-SIS001",
        siswa_id: "SIS-001",
        ta_id: "TA-2026-2027",
        tanggal: "2026-11-23",
        periode_bulan: "2026-11",
        bangun_pagi: "Sudah Terbiasa",
        beribadah: "Mulai Terbiasa",
        berolahraga: "Mulai Terbiasa",
        makan_sehat: "Sudah Terbiasa",
        gemar_belajar: "Sudah Terbiasa",
        bermasyarakat: "Mulai Terbiasa",
        tidur_cepat: "Mulai Terbiasa",
        catatan_ortu: "Ali bangun pukul 05.30 langsung wudhu dan sarapan telur.",
        updated_at: "2026-11-23T20:10:00Z"
      },
      {
        kaih_harian_id: "KAIH-20261124-SIS001",
        siswa_id: "SIS-001",
        ta_id: "TA-2026-2027",
        tanggal: "2026-11-24",
        periode_bulan: "2026-11",
        bangun_pagi: "Sudah Terbiasa",
        beribadah: "Sudah Terbiasa",
        berolahraga: "Mulai Terbiasa",
        makan_sehat: "Sudah Terbiasa",
        gemar_belajar: "Mulai Terbiasa",
        bermasyarakat: "Sudah Terbiasa",
        tidur_cepat: "Belum Terbiasa",
        catatan_ortu: "Semangat mengaji setelah Maghrib, namun tidur agak malam pukul 21.15.",
        updated_at: "2026-11-24T21:15:00Z"
      },
      {
        kaih_harian_id: "KAIH-20261125-SIS001",
        siswa_id: "SIS-001",
        ta_id: "TA-2026-2027",
        tanggal: "2026-11-25",
        periode_bulan: "2026-11",
        bangun_pagi: "Sudah Terbiasa",
        beribadah: "Sudah Terbiasa",
        berolahraga: "Sudah Terbiasa",
        makan_sehat: "Sudah Terbiasa",
        gemar_belajar: "Sudah Terbiasa",
        bermasyarakat: "Mulai Terbiasa",
        tidur_cepat: "Mulai Terbiasa",
        catatan_ortu: "Bermain sepeda di halaman sore hari lalu tidur pukul 20.30.",
        updated_at: "2026-11-25T20:35:00Z"
      },
      {
        kaih_harian_id: "KAIH-20261125-SIS002",
        siswa_id: "SIS-002",
        ta_id: "TA-2026-2027",
        tanggal: "2026-11-25",
        periode_bulan: "2026-11",
        bangun_pagi: "Sudah Terbiasa",
        beribadah: "Sudah Terbiasa",
        berolahraga: "Sudah Terbiasa",
        makan_sehat: "Sudah Terbiasa",
        gemar_belajar: "Sudah Terbiasa",
        bermasyarakat: "Sudah Terbiasa",
        tidur_cepat: "Sudah Terbiasa",
        catatan_ortu: "Zahra konsisten melaksanakan 7 kebiasaan anak hebat.",
        updated_at: "2026-11-25T20:00:00Z"
      }
    ],
    kaihFotoBulanan: [],
    ulasanOrtu: [
      {
        ulasan_id: "ULS-001",
        siswa_id: "SIS-001",
        ta_id: "TA-2026-2027",
        periode_bulan: "2026-11",
        pengirim_role: "OrangTua",
        pengirim_nama: "Bunda Aisyah",
        isi_pesan: "Alhamdulillah di rumah Ali makin semangat menunjuk huruf di buku ceritanya, Ustadzah.",
        created_at: "2026-11-24T19:30:00Z"
      },
      {
        ulasan_id: "ULS-002",
        siswa_id: "SIS-001",
        ta_id: "TA-2026-2027",
        periode_bulan: "2026-11",
        pengirim_role: "Guru",
        pengirim_nama: "Ustadzah Siti Rahmawati",
        isi_pesan: "MasyaAllah Bunda, di kelas juga Ali antusias saat bermain kartu suku kata ba-bi-bu. Terima kasih sinerginya di rumah!",
        created_at: "2026-11-25T08:15:00Z"
      }
    ],
    masterMateri: MASTER_MATERI_SEED,
    masterTips: MASTER_TIPS_SEED,
    bankMateriHarian: BANK_MATERI_HARIAN_SEED,
    logMateriHarian: [
      {
        id_log: "LOG-20261103-01",
        tanggal: "2026-11-03",
        id_siswa: "SIS-001",
        nama_siswa: "Muhammad Ali Al-Fatih",
        kelas: "Kelas A",
        ta_id: "TA-2026-2027",
        bidang: "Literasi",
        kategori: "Huruf",
        kode_item: "HRF-01",
        item_dipilih: "a, i, u, e, o",
        halaman_iqra: "",
        status_penguasaan: "Lancar",
        catatan_guru: "Mengenal seluruh huruf vokal dengan tepat.",
        nama_guru: "Ustadzah Siti Rahmawati, S.Pd",
        timestamp: "2026-11-03T10:30:00Z"
      },
      {
        id_log: "LOG-20261110-01",
        tanggal: "2026-11-10",
        id_siswa: "SIS-001",
        nama_siswa: "Muhammad Ali Al-Fatih",
        kelas: "Kelas A",
        ta_id: "TA-2026-2027",
        bidang: "Literasi",
        kategori: "Suku Kata",
        kode_item: "SKM-01",
        item_dipilih: "ba, bi, bu, be, bo",
        halaman_iqra: "",
        status_penguasaan: "Perlu Latihan",
        catatan_guru: "Sudah bisa ba dan bu, masih tertukar bunyi be dan bo.",
        nama_guru: "Ustadzah Siti Rahmawati, S.Pd",
        timestamp: "2026-11-10T10:30:00Z"
      },
      {
        id_log: "LOG-20261117-01",
        tanggal: "2026-11-17",
        id_siswa: "SIS-001",
        nama_siswa: "Muhammad Ali Al-Fatih",
        kelas: "Kelas A",
        ta_id: "TA-2026-2027",
        bidang: "Hijaiyah_Iqra",
        kategori: "Iqra",
        kode_item: "IQR-1A",
        item_dipilih: "\u062C\u064E (Ja), \u062D\u064E (Ha), \u062E\u064E (Kha)",
        halaman_iqra: "Hal. 6",
        status_penguasaan: "Perlu Latihan",
        catatan_guru: "Pelafalan \u062D\u064E dan \u062E\u064E perlu latihan singkat 5 menit di rumah.",
        nama_guru: "Ustadzah Siti Rahmawati, S.Pd",
        timestamp: "2026-11-17T09:15:00Z"
      },
      {
        id_log: "LOG-20261124-01",
        tanggal: "2026-11-24",
        id_siswa: "SIS-001",
        nama_siswa: "Muhammad Ali Al-Fatih",
        kelas: "Kelas A",
        ta_id: "TA-2026-2027",
        bidang: "Literasi",
        kategori: "Kata",
        kode_item: "KTM-04",
        item_dipilih: "bo-la, ba-ju, bu-ku",
        halaman_iqra: "",
        status_penguasaan: "Lancar",
        catatan_guru: "Mampu membaca kata 2 suku kata bergambar dengan gembira.",
        nama_guru: "Ustadzah Siti Rahmawati, S.Pd",
        timestamp: "2026-11-24T10:40:00Z"
      },
      {
        id_log: "LOG-20261125-01",
        tanggal: "2026-11-25",
        id_siswa: "SIS-002",
        nama_siswa: "Zahra Humaira Putri",
        kelas: "Kelas B",
        ta_id: "TA-2026-2027",
        bidang: "Literasi",
        kategori: "Kalimat",
        kode_item: "KLM-04",
        item_dipilih: "Aku berdoa sebelum makan., Ali rajin mengaji setiap sore.",
        halaman_iqra: "",
        status_penguasaan: "Lancar",
        catatan_guru: "Intonasi membaca kalimat sangat baik dan memahami maknanya.",
        nama_guru: "Ustadzah Nurul Hidayah, S.Pd.I",
        timestamp: "2026-11-25T10:00:00Z"
      },
      {
        id_log: "LOG-20261125-02",
        tanggal: "2026-11-25",
        id_siswa: "SIS-002",
        nama_siswa: "Zahra Humaira Putri",
        kelas: "Kelas B",
        ta_id: "TA-2026-2027",
        bidang: "Hijaiyah_Iqra",
        kategori: "Iqra",
        kode_item: "IQR-3B",
        item_dipilih: "Bunyi Dhammah (\u0628\u064F \u062A\u064F \u062B\u064F), Mad Wau 2 Harakat (\u064A\u064E\u0642\u064F\u0648\u0644\u064F / \u0646\u064F\u0648\u0631\u064F)",
        halaman_iqra: "Hal. 16",
        status_penguasaan: "Lancar",
        catatan_guru: "Panjang pendek mad wau 2 harakat tepat.",
        nama_guru: "Ustadzah Nurul Hidayah, S.Pd.I",
        timestamp: "2026-11-25T09:10:00Z"
      }
    ],
    daftarHadir: [
      {
        absen_id: "ABS-20261124-SIS001",
        tanggal: "2026-11-24",
        periode_bulan: "2026-11",
        semester: "Semester 1",
        ta_id: "TA-2026-2027",
        siswa_id: "SIS-001",
        nama_anak: "Muhammad Ali Al-Fatih",
        kelas: "Kelas A",
        status: "HADIR",
        diinput_oleh: "Ustadzah Siti Rahmawati, S.Pd",
        updated_at: "2026-11-24T08:00:00Z"
      },
      {
        absen_id: "ABS-20261124-SIS004",
        tanggal: "2026-11-24",
        periode_bulan: "2026-11",
        semester: "Semester 1",
        ta_id: "TA-2026-2027",
        siswa_id: "SIS-004",
        nama_anak: "Khansa Nabila",
        kelas: "Kelas A",
        status: "HADIR",
        diinput_oleh: "Ustadzah Siti Rahmawati, S.Pd",
        updated_at: "2026-11-24T08:00:00Z"
      },
      {
        absen_id: "ABS-20261125-SIS001",
        tanggal: "2026-11-25",
        periode_bulan: "2026-11",
        semester: "Semester 1",
        ta_id: "TA-2026-2027",
        siswa_id: "SIS-001",
        nama_anak: "Muhammad Ali Al-Fatih",
        kelas: "Kelas A",
        status: "HADIR",
        diinput_oleh: "Ustadzah Siti Rahmawati, S.Pd",
        updated_at: "2026-11-25T08:00:00Z"
      },
      {
        absen_id: "ABS-20261125-SIS004",
        tanggal: "2026-11-25",
        periode_bulan: "2026-11",
        semester: "Semester 1",
        ta_id: "TA-2026-2027",
        siswa_id: "SIS-004",
        nama_anak: "Khansa Nabila",
        kelas: "Kelas A",
        status: "SAKIT",
        diinput_oleh: "Ustadzah Siti Rahmawati, S.Pd",
        updated_at: "2026-11-25T08:00:00Z"
      },
      {
        absen_id: "ABS-20261125-SIS002",
        tanggal: "2026-11-25",
        periode_bulan: "2026-11",
        semester: "Semester 1",
        ta_id: "TA-2026-2027",
        siswa_id: "SIS-002",
        nama_anak: "Zahra Humaira Putri",
        kelas: "Kelas B",
        status: "HADIR",
        diinput_oleh: "Ustadzah Nurul Hidayah, S.Pd.I",
        updated_at: "2026-11-25T08:05:00Z"
      },
      {
        absen_id: "ABS-20261125-SIS003",
        tanggal: "2026-11-25",
        periode_bulan: "2026-11",
        semester: "Semester 1",
        ta_id: "TA-2026-2027",
        siswa_id: "SIS-003",
        nama_anak: "Hasan Abdurrahman",
        kelas: "Kelas B",
        status: "HADIR",
        diinput_oleh: "Ustadzah Nurul Hidayah, S.Pd.I",
        updated_at: "2026-11-25T08:05:00Z"
      }
    ],
    asesmenAnekdot: [
      {
        anekdot_id: "ANK-001",
        tanggal: "2026-11-24",
        periode_bulan: "2026-11",
        semester: "Semester 1",
        ta_id: "TA-2026-2027",
        siswa_id: "SIS-001",
        nama_anak: "Muhammad Ali Al-Fatih",
        kelas: "Kelas A",
        deskripsi_kejadian: 'Saat jam istirahat, Ali melihat temannya kesulitan membuka kotak bekal. Ali segera membantu memegang tutupnya sambil berkata "Sini Ali bantu, baca Bismillah dulu ya".',
        analisis_nabp: "Ali menunjukkan perilaku kasih sayang dan membiasakan mengucap basmalah sebelum makan.",
        analisis_jd: "Ali mampu berempati dan berinteraksi sosial positif dengan teman sebayanya.",
        analisis_lmstrs: "Ali mengomunikasikan niat membantu menggunakan kalimat sederhana yang jelas.",
        umpan_balik: "Guru memberi apresiasi atas sikap tolong-menolong Ali. Orang tua dapat melanjutkan pembiasaan empati di rumah.",
        guru_nama: "Ustadzah Siti Rahmawati, S.Pd",
        updated_at: "2026-11-24T11:30:00Z"
      }
    ],
    asesmenHasilKarya: [],
    asesmenCeklis: [
      {
        ceklis_id: "CEK-001",
        tanggal: "2026-11-20",
        periode_bulan: "2026-11",
        semester: "Semester 1",
        ta_id: "TA-2026-2027",
        siswa_id: "SIS-001",
        nama_anak: "Muhammad Ali Al-Fatih",
        kelas: "Kelas A",
        elemen: "Nilai Agama & Budi Pekerti",
        kode_atp: "NABP.1.5",
        tujuan_pembelajaran: "Murid terbiasa mengucapkan doa harian sebelum dan sesudah melakukan kegiatan sehari-hari.",
        konteks: "Makan Bekal Bersama",
        status_muncul: "Sudah Muncul",
        kejadian_teramati: "Ali memimpin doa sebelum makan bersama teman meja tanpa diingatkan.",
        guru_nama: "Ustadzah Siti Rahmawati, S.Pd",
        updated_at: "2026-11-20T09:45:00Z"
      },
      {
        ceklis_id: "CEK-002",
        tanggal: "2026-11-21",
        periode_bulan: "2026-11",
        semester: "Semester 1",
        ta_id: "TA-2026-2027",
        siswa_id: "SIS-002",
        nama_anak: "Zahra Humaira Putri",
        kelas: "Kelas B",
        elemen: "Literasi & STEAM",
        kode_atp: "LMSTRS.2.3",
        tujuan_pembelajaran: "Murid mengidentifikasi, melanjutkan, dan menciptakan pola berulang sederhana (A-B-A-B atau A-B-C).",
        konteks: "Sentra Balok & Loose Parts",
        status_muncul: "Sudah Muncul",
        kejadian_teramati: "Zahra menyusun manik-manik pola merah-kuning-hijau secara konsisten untuk membuat gelang.",
        guru_nama: "Ustadzah Nurul Hidayah, S.Pd.I",
        updated_at: "2026-11-21T10:15:00Z"
      }
    ],
    masterAtp: MASTER_ATP_SEED,
    masterKelas: [
      {
        kelas_id: "KLS-A",
        nama_kelas: "Kelas A",
        jenjang: "A",
        urutan: 1,
        aktif: true
      },
      {
        kelas_id: "KLS-B",
        nama_kelas: "Kelas B",
        jenjang: "B",
        urutan: 2,
        aktif: true
      }
    ]
  };
}

// src/utils/kelas.ts
var DEFAULT_MASTER_KELAS = [
  {
    kelas_id: "KLS-A",
    nama_kelas: "Kelas A",
    jenjang: "A",
    urutan: 1,
    aktif: true
  },
  {
    kelas_id: "KLS-B",
    nama_kelas: "Kelas B",
    jenjang: "B",
    urutan: 2,
    aktif: true
  }
];
function getMasterKelasList(db, includeInactive = false) {
  const base = db.masterKelas && db.masterKelas.length > 0 ? db.masterKelas.map((k, idx) => ({
    ...k,
    jenjang: k.jenjang === "B" ? "B" : "A",
    urutan: Number(k.urutan) || idx + 1,
    aktif: k.aktif !== false
  })) : DEFAULT_MASTER_KELAS.map((k) => ({ ...k }));
  const existingNames = new Set(base.map((k) => k.nama_kelas.toLowerCase()));
  let maxOrder = base.reduce((m, k) => Math.max(m, k.urutan), 0);
  for (const s of db.siswa || []) {
    const kName = String(s.kelas_aktif || "").trim();
    if (!kName || kName === "Lulus" || existingNames.has(kName.toLowerCase())) continue;
    existingNames.add(kName.toLowerCase());
    maxOrder += 1;
    base.push({
      kelas_id: `KLS-AUTO-${maxOrder}`,
      nama_kelas: kName,
      jenjang: inferJenjangFromName(kName),
      urutan: maxOrder,
      aktif: true
    });
  }
  return base.filter((k) => includeInactive || k.aktif !== false).sort((a, b) => a.urutan - b.urutan);
}
function inferJenjangFromName(namaKelas) {
  const lower = namaKelas.toLowerCase();
  if (/\b(?:kelas\s*|tk\s*|kelompok\s*)?b\d*\b|lanjut|sd|tahfidz/.test(lower)) return "B";
  return "A";
}
function getKelasMeta(db, kelasName) {
  const list = getMasterKelasList(db, true);
  return list.find((k) => k.nama_kelas.toLowerCase() === String(kelasName || "").trim().toLowerCase());
}
function isKelasLanjutan(db, kelasName) {
  if (!kelasName || kelasName === "Lulus") return false;
  const meta = getKelasMeta(db, kelasName);
  if (meta) return meta.jenjang === "B";
  return inferJenjangFromName(kelasName) === "B";
}
function getNextClassTarget(db, kelasName) {
  const ordered = getMasterKelasList(db);
  const currentMeta = getKelasMeta(db, kelasName);
  const currentIsB = currentMeta ? currentMeta.jenjang === "B" : isKelasLanjutan(db, kelasName);
  if (currentIsB) {
    return { isFinal: true, nextClassName: "Lulus", label: "Lulus (Lanjut ke SD)" };
  }
  const firstJenjangB = ordered.find((k) => k.jenjang === "B");
  if (firstJenjangB) {
    return {
      isFinal: false,
      nextClassName: firstJenjangB.nama_kelas,
      label: `Lanjut ke ${firstJenjangB.nama_kelas}`
    };
  }
  return { isFinal: true, nextClassName: "Lulus", label: "Lulus (Lanjut ke SD)" };
}

// src/utils/normalizeDb.ts
function normalizeUsernameStr(raw) {
  return String(raw ?? "").trim().replace(/^@+/, "").toLowerCase();
}
function normalizeDateYmd(raw) {
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return raw.toISOString().slice(0, 10);
  }
  const s = String(raw ?? "").trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return s.slice(0, 10);
  }
  return s;
}
function normalizePeriodeMonth(raw) {
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return raw.toISOString().slice(0, 7);
  }
  const s = String(raw ?? "").trim();
  if (/^\d{4}-\d{2}/.test(s)) {
    return s.slice(0, 7);
  }
  return s;
}
function normalizeBooleanFlag(raw, defaultValue = true) {
  if (typeof raw === "boolean") return raw;
  if (raw === void 0 || raw === null || raw === "") return defaultValue;
  const s = String(raw).trim().toLowerCase();
  if (s === "false" || s === "0" || s === "no" || s === "tidak") return false;
  if (s === "true" || s === "1" || s === "yes" || s === "ya") return true;
  return defaultValue;
}
function isUserActive(u) {
  return normalizeBooleanFlag(u.status_aktif, true);
}
function isAdminClaimedDb(db) {
  if (!db) return false;
  if (normalizeBooleanFlag(db.pengaturanSekolah?.admin_claimed, false)) return true;
  return Array.isArray(db.users) ? db.users.some((u) => u?.role === "Admin" && isUserActive(u)) : false;
}
function defaultMasterKelas() {
  return [
    { kelas_id: "KLS-A", nama_kelas: "Kelas A", jenjang: "A", urutan: 1, aktif: true },
    { kelas_id: "KLS-B", nama_kelas: "Kelas B", jenjang: "B", urutan: 2, aktif: true }
  ];
}
function normalizeSchoolDatabase(rawInput) {
  const seed = createInitialSeedDatabase();
  const raw = rawInput || {};
  const rawCfg = raw.pengaturanSekolah || {};
  const users = Array.isArray(raw.users) ? raw.users.map((u) => ({
    ...u,
    user_id: String(u.user_id ?? "").trim(),
    username: normalizeUsernameStr(u.username),
    password_hash: String(u.password_hash ?? ""),
    ...typeof u.password === "string" ? { password: u.password } : {},
    role: u.role === "Admin" ? "Admin" : u.role === "Guru" ? "Guru" : "OrangTua",
    nama_lengkap: String(u.nama_lengkap ?? "").trim(),
    no_hp: String(u.no_hp ?? "").trim(),
    kelas_ampu: String(u.kelas_ampu ?? "").trim(),
    status_aktif: normalizeBooleanFlag(u.status_aktif, true)
  })) : seed.users;
  const siswa = Array.isArray(raw.siswa) ? raw.siswa.map((s) => ({
    ...s,
    siswa_id: String(s.siswa_id ?? "").trim(),
    nis: String(s.nis ?? "").trim(),
    nama_anak: String(s.nama_anak ?? "").trim(),
    jenis_kelamin: s.jenis_kelamin === "P" ? "P" : "L",
    tanggal_lahir: normalizeDateYmd(s.tanggal_lahir),
    ortu_user_id: String(s.ortu_user_id ?? "").trim(),
    kelas_aktif: String(s.kelas_aktif ?? "Kelas A").trim() || "Kelas A",
    status_siswa: s.status_siswa === "Lulus" ? "Lulus" : s.status_siswa === "Pindah" ? "Pindah" : "Aktif",
    target_literasi_kelas_b: s.target_literasi_kelas_b || "TRACK_1",
    target_kustom_kelas_b: String(s.target_kustom_kelas_b ?? ""),
    keputusan_kenaikan: s.keputusan_kenaikan || "BELUM_DITENTUKAN",
    catatan_kenaikan: String(s.catatan_kenaikan ?? ""),
    keputusan_diatur_oleh: String(s.keputusan_diatur_oleh ?? "")
  })) : seed.siswa;
  const masterKelas = Array.isArray(raw.masterKelas) && raw.masterKelas.length > 0 ? raw.masterKelas.map((k, idx) => ({
    kelas_id: String(k.kelas_id ?? `KLS-${idx + 1}`).trim(),
    nama_kelas: String(k.nama_kelas ?? "").trim(),
    jenjang: k.jenjang === "B" ? "B" : "A",
    urutan: Number(k.urutan) || idx + 1,
    aktif: normalizeBooleanFlag(k.aktif, true)
  })) : seed.masterKelas && seed.masterKelas.length > 0 ? seed.masterKelas : defaultMasterKelas();
  const adminClaimed = normalizeBooleanFlag(rawCfg.admin_claimed, false) || users.some((u) => u.role === "Admin" && isUserActive(u));
  return {
    pengaturanSekolah: {
      ...seed.pengaturanSekolah,
      ...rawCfg,
      nama_sekolah: String(rawCfg.nama_sekolah ?? seed.pengaturanSekolah.nama_sekolah).trim(),
      npsn: String(rawCfg.npsn ?? seed.pengaturanSekolah.npsn).trim(),
      alamat_sekolah: String(rawCfg.alamat_sekolah ?? seed.pengaturanSekolah.alamat_sekolah).trim(),
      kontak_sekolah: String(rawCfg.kontak_sekolah ?? seed.pengaturanSekolah.kontak_sekolah).trim(),
      kepala_sekolah: String(rawCfg.kepala_sekolah ?? seed.pengaturanSekolah.kepala_sekolah).trim(),
      tahun_ajaran_aktif: String(
        rawCfg.tahun_ajaran_aktif ?? seed.pengaturanSekolah.tahun_ajaran_aktif
      ).trim(),
      semester_aktif: rawCfg.semester_aktif === "Semester 2" ? "Semester 2" : "Semester 1",
      folder_drive_id: String(rawCfg.folder_drive_id ?? "").trim(),
      gas_webapp_url: String(rawCfg.gas_webapp_url ?? "").trim(),
      gas_sync_key: String(rawCfg.gas_sync_key ?? seed.pengaturanSekolah.gas_sync_key ?? "").trim(),
      google_spreadsheet_id: String(rawCfg.google_spreadsheet_id ?? "").trim(),
      google_spreadsheet_url: String(rawCfg.google_spreadsheet_url ?? "").trim(),
      auto_sync_sheets: normalizeBooleanFlag(rawCfg.auto_sync_sheets, true),
      admin_claimed: adminClaimed
    },
    users,
    tahunAjaran: Array.isArray(raw.tahunAjaran) ? raw.tahunAjaran.map((t) => ({
      ...t,
      ta_id: String(t.ta_id ?? "").trim(),
      nama_ta: String(t.nama_ta ?? "").trim(),
      tanggal_mulai: normalizeDateYmd(t.tanggal_mulai),
      tanggal_selesai: normalizeDateYmd(t.tanggal_selesai),
      status_aktif: normalizeBooleanFlag(t.status_aktif, false)
    })) : seed.tahunAjaran,
    siswa,
    riwayatKelas: Array.isArray(raw.riwayatKelas) ? raw.riwayatKelas.map((r) => ({
      ...r,
      riwayat_id: String(r.riwayat_id ?? "").trim(),
      siswa_id: String(r.siswa_id ?? "").trim(),
      ta_id: String(r.ta_id ?? "").trim(),
      nama_ta: String(r.nama_ta ?? "").trim(),
      kelas: String(r.kelas ?? "").trim(),
      wali_kelas_id: String(r.wali_kelas_id ?? "").trim(),
      catatan: String(r.catatan ?? "")
    })) : seed.riwayatKelas,
    antropometri: Array.isArray(raw.antropometri) ? raw.antropometri.map((a) => ({
      ...a,
      siswa_id: String(a.siswa_id ?? "").trim(),
      periode_bulan: normalizePeriodeMonth(a.periode_bulan)
    })) : seed.antropometri,
    literasi: Array.isArray(raw.literasi) ? raw.literasi.map((l) => ({
      ...l,
      siswa_id: String(l.siswa_id ?? "").trim(),
      periode_bulan: normalizePeriodeMonth(l.periode_bulan)
    })) : seed.literasi,
    keagamaan: Array.isArray(raw.keagamaan) ? raw.keagamaan.map((k) => ({
      ...k,
      siswa_id: String(k.siswa_id ?? "").trim(),
      periode_bulan: normalizePeriodeMonth(k.periode_bulan)
    })) : seed.keagamaan,
    kaihHarian: Array.isArray(raw.kaihHarian) ? raw.kaihHarian.map((k) => ({
      ...k,
      siswa_id: String(k.siswa_id ?? "").trim(),
      tanggal: normalizeDateYmd(k.tanggal),
      periode_bulan: normalizePeriodeMonth(k.periode_bulan)
    })) : seed.kaihHarian,
    kaihFotoBulanan: Array.isArray(raw.kaihFotoBulanan) ? raw.kaihFotoBulanan.map((f) => ({
      ...f,
      siswa_id: String(f.siswa_id ?? "").trim(),
      periode_bulan: normalizePeriodeMonth(f.periode_bulan)
    })) : seed.kaihFotoBulanan,
    ulasanOrtu: Array.isArray(raw.ulasanOrtu) ? raw.ulasanOrtu.map((u) => ({
      ...u,
      siswa_id: String(u.siswa_id ?? "").trim(),
      periode_bulan: normalizePeriodeMonth(u.periode_bulan)
    })) : seed.ulasanOrtu,
    masterMateri: Array.isArray(raw.masterMateri) && raw.masterMateri.length > 0 ? raw.masterMateri.map((m) => ({
      ...m,
      urutan: Number(m.urutan) || 1,
      aktif: normalizeBooleanFlag(m.aktif, true)
    })) : seed.masterMateri,
    masterTips: Array.isArray(raw.masterTips) && raw.masterTips.length > 0 ? raw.masterTips.map((t) => ({
      ...t,
      aktif: normalizeBooleanFlag(t.aktif, true)
    })) : seed.masterTips,
    bankMateriHarian: Array.isArray(raw.bankMateriHarian) && raw.bankMateriHarian.length > 0 ? raw.bankMateriHarian.map((b) => ({
      ...b,
      aktif: normalizeBooleanFlag(b.aktif, true)
    })) : seed.bankMateriHarian,
    logMateriHarian: Array.isArray(raw.logMateriHarian) ? raw.logMateriHarian.map((l) => ({
      ...l,
      id_siswa: String(l.id_siswa ?? "").trim(),
      tanggal: normalizeDateYmd(l.tanggal),
      halaman_iqra: String(l.halaman_iqra ?? "")
    })) : seed.logMateriHarian,
    daftarHadir: Array.isArray(raw.daftarHadir) ? raw.daftarHadir.map((d) => ({
      ...d,
      siswa_id: String(d.siswa_id ?? "").trim(),
      tanggal: normalizeDateYmd(d.tanggal),
      periode_bulan: normalizePeriodeMonth(d.periode_bulan)
    })) : seed.daftarHadir,
    asesmenAnekdot: Array.isArray(raw.asesmenAnekdot) ? raw.asesmenAnekdot.map((a) => ({
      ...a,
      siswa_id: String(a.siswa_id ?? "").trim(),
      tanggal: normalizeDateYmd(a.tanggal),
      periode_bulan: normalizePeriodeMonth(a.periode_bulan)
    })) : seed.asesmenAnekdot,
    asesmenHasilKarya: Array.isArray(raw.asesmenHasilKarya) ? raw.asesmenHasilKarya.map((k) => ({
      ...k,
      siswa_id: String(k.siswa_id ?? "").trim(),
      tanggal: normalizeDateYmd(k.tanggal),
      periode_bulan: normalizePeriodeMonth(k.periode_bulan)
    })) : seed.asesmenHasilKarya,
    asesmenCeklis: Array.isArray(raw.asesmenCeklis) ? raw.asesmenCeklis.map((c) => ({
      ...c,
      siswa_id: String(c.siswa_id ?? "").trim(),
      tanggal: normalizeDateYmd(c.tanggal),
      periode_bulan: normalizePeriodeMonth(c.periode_bulan)
    })) : seed.asesmenCeklis,
    masterAtp: Array.isArray(raw.masterAtp) && raw.masterAtp.length > 0 ? raw.masterAtp.map((a) => ({
      ...a,
      aktif: normalizeBooleanFlag(a.aktif, true)
    })) : seed.masterAtp,
    masterKelas
  };
}
function mergePulledGasDatabase(currentRaw, pulledRaw, options) {
  const current = normalizeSchoolDatabase(currentRaw);
  const pulled = normalizeSchoolDatabase(pulledRaw);
  const localClaimed = isAdminClaimedDb(current);
  const remoteClaimed = isAdminClaimedDb(pulled);
  if (!options.forceRemote && !remoteClaimed && (localClaimed || current.siswa.length > pulled.siswa.length)) {
    return {
      db: {
        ...current,
        pengaturanSekolah: {
          ...current.pengaturanSekolah,
          gas_webapp_url: options.gasUrl || current.pengaturanSekolah.gas_webapp_url,
          gas_sync_key: options.syncKey || current.pengaturanSekolah.gas_sync_key,
          admin_claimed: localClaimed
        }
      },
      adoptedRemote: false,
      shouldBootstrapRemote: true
    };
  }
  const existingById = new Map(current.users.map((u) => [u.user_id, u]));
  const existingByName = new Map(current.users.map((u) => [normalizeUsernameStr(u.username), u]));
  const mergedUsers = pulled.users.map((u) => {
    const prev = existingById.get(u.user_id) || existingByName.get(normalizeUsernameStr(u.username));
    return {
      ...u,
      password_hash: u.password_hash || prev?.password_hash || ""
    };
  });
  if (localClaimed && !mergedUsers.some((u) => u.role === "Admin" && isUserActive(u))) {
    for (const adm of current.users) {
      if (adm.role === "Admin" && isUserActive(adm)) {
        mergedUsers.unshift(adm);
      }
    }
  }
  const merged = {
    ...current,
    ...pulled,
    users: mergedUsers,
    pengaturanSekolah: {
      ...current.pengaturanSekolah,
      ...pulled.pengaturanSekolah,
      gas_webapp_url: options.gasUrl || current.pengaturanSekolah.gas_webapp_url,
      gas_sync_key: options.syncKey || current.pengaturanSekolah.gas_sync_key,
      admin_claimed: localClaimed || remoteClaimed || mergedUsers.some((u) => u.role === "Admin" && isUserActive(u))
    }
  };
  return {
    db: merged,
    adoptedRemote: true,
    shouldBootstrapRemote: false
  };
}

// src/utils/studentCleanup.ts
function purgeStudentsFromDatabase(db, studentIds) {
  const idSet = new Set(Array.from(studentIds).filter(Boolean));
  if (idSet.size === 0) return db;
  return {
    ...db,
    siswa: db.siswa.filter((s) => !idSet.has(s.siswa_id)),
    riwayatKelas: db.riwayatKelas.filter((r) => !idSet.has(r.siswa_id)),
    antropometri: db.antropometri.filter((a) => !idSet.has(a.siswa_id)),
    literasi: db.literasi.filter((l) => !idSet.has(l.siswa_id)),
    keagamaan: db.keagamaan.filter((k) => !idSet.has(k.siswa_id)),
    kaihHarian: db.kaihHarian.filter((k) => !idSet.has(k.siswa_id)),
    kaihFotoBulanan: db.kaihFotoBulanan.filter((f) => !idSet.has(f.siswa_id)),
    ulasanOrtu: db.ulasanOrtu.filter((u) => !idSet.has(u.siswa_id)),
    logMateriHarian: db.logMateriHarian.filter((l) => !idSet.has(l.id_siswa)),
    daftarHadir: db.daftarHadir.filter((d) => !idSet.has(d.siswa_id)),
    asesmenAnekdot: db.asesmenAnekdot.filter((a) => !idSet.has(a.siswa_id)),
    asesmenHasilKarya: db.asesmenHasilKarya.filter((k) => !idSet.has(k.siswa_id)),
    asesmenCeklis: db.asesmenCeklis.filter((c) => !idSet.has(c.siswa_id))
  };
}

// server/app.ts
var SESSION_COOKIE_NAME = "tk_aw_session";
var HYDRATE_TTL_MS = 15e3;
var FORCE_HYDRATE_MIN_INTERVAL_MS = 2500;
var LEGACY_BROKEN_GAS_URLS = /* @__PURE__ */ new Set([
  "https://script.google.com/macros/s/AKfycbx7YdlltbMU1AYi1wKghGf1fGL5g4HU2dZqB2dhJri0w36UuT3mgp43ivXTIA51niJn2g/exec"
]);
function hashSha256(text) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}
function hashPasswordScrypt(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}
function verifyPassword(password, storedHash) {
  if (!storedHash || typeof storedHash !== "string") return false;
  if (storedHash.startsWith("scrypt$")) {
    const parts = storedHash.split("$");
    if (parts.length !== 3) return false;
    const [, salt, hexHash] = parts;
    if (!salt || !hexHash) return false;
    try {
      const expectedBuf = Buffer.from(hexHash, "hex");
      const actualBuf = crypto.scryptSync(password, salt, 64);
      return expectedBuf.length === actualBuf.length && crypto.timingSafeEqual(expectedBuf, actualBuf);
    } catch {
      return false;
    }
  }
  if (/^[a-f0-9]{64}$/i.test(storedHash)) {
    const expectedBuf = Buffer.from(storedHash.toLowerCase(), "hex");
    const actualBuf = Buffer.from(hashSha256(password), "hex");
    return expectedBuf.length === actualBuf.length && crypto.timingSafeEqual(expectedBuf, actualBuf);
  }
  return false;
}
function verifyPasswordFlexible(rawPassword, storedHash) {
  const raw = String(rawPassword ?? "");
  if (verifyPassword(raw, storedHash)) return true;
  const noNewlines = raw.replace(/[\r\n]+/g, "");
  if (noNewlines !== raw && verifyPassword(noNewlines, storedHash)) return true;
  return false;
}
function isAllowedGasUrl(rawUrl) {
  if (!rawUrl || !rawUrl.trim()) return false;
  if (rawUrl.includes("GANTI_DENGAN_DEPLOYMENT_ID_ANDA")) return false;
  try {
    const parsed = new URL(rawUrl.trim());
    return parsed.protocol === "https:" && (parsed.hostname === "script.google.com" || parsed.hostname.endsWith(".googleusercontent.com"));
  } catch {
    return false;
  }
}
function sanitizeDbForRole(db, role) {
  const isAdmin = role === "Admin";
  return {
    ...db,
    pengaturanSekolah: isAdmin ? db.pengaturanSekolah : { ...db.pengaturanSekolah, gas_sync_key: "" },
    users: isAdmin ? db.users : db.users.map((u) => ({ ...u, password_hash: "" }))
  };
}
function parseCookies(req) {
  const raw = req.headers.cookie;
  if (!raw) return {};
  const out = {};
  for (const part of raw.split(";")) {
    const idx = part.indexOf("=");
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (!key) continue;
    try {
      out[key] = decodeURIComponent(val);
    } catch {
      out[key] = val;
    }
  }
  return out;
}
function isSecureRequest(req) {
  const proto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim().toLowerCase();
  const ssl = String(req.headers["x-forwarded-ssl"] || "").trim().toLowerCase();
  const origin = String(req.headers.origin || "").trim().toLowerCase();
  const referer = String(req.headers.referer || "").trim().toLowerCase();
  return Boolean(
    req.secure || proto === "https" || ssl === "on" || origin.startsWith("https://") || referer.startsWith("https://")
  );
}
function setSessionCookie(req, res, token) {
  const secure = isSecureRequest(req);
  const attrs = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    `Max-Age=${60 * 60 * 12}`,
    "HttpOnly",
    secure ? "SameSite=None" : "SameSite=Lax",
    ...secure ? ["Secure", "Partitioned"] : []
  ];
  res.setHeader("Set-Cookie", attrs.join("; "));
}
function clearSessionCookie(req, res) {
  const secure = isSecureRequest(req);
  const attrs = [
    `${SESSION_COOKIE_NAME}=`,
    "Path=/",
    "Max-Age=0",
    "HttpOnly",
    secure ? "SameSite=None" : "SameSite=Lax",
    ...secure ? ["Secure", "Partitioned"] : []
  ];
  res.setHeader("Set-Cookie", attrs.join("; "));
}
function isCsrfSafeForCookieMutation(req) {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return true;
  const xrw = String(req.headers["x-requested-with"] || "").trim().toLowerCase();
  if (xrw === "xmlhttprequest") return true;
  const expectedHost = String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim().toLowerCase();
  if (!expectedHost) return false;
  const origin = req.headers.origin;
  if (origin) {
    try {
      return new URL(origin).host.toLowerCase() === expectedHost;
    } catch {
      return false;
    }
  }
  const referer = req.headers.referer;
  if (referer) {
    try {
      return new URL(referer).host.toLowerCase() === expectedHost;
    } catch {
      return false;
    }
  }
  return false;
}
function createApiApp(options = {}) {
  const IS_VERCEL = options.isVercel ?? Boolean(process.env.VERCEL);
  const DATA_DIR = options.dataDir ? path.resolve(options.dataDir) : IS_VERCEL ? path.join("/tmp", "tk-alwashliyah-data") : path.resolve(process.cwd(), "data");
  const DB_FILE = path.join(DATA_DIR, "db.json");
  const SECRET_FILE = path.join(DATA_DIR, ".session-secret");
  function loadOrCreateSessionSecret() {
    if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
    if (IS_VERCEL) {
      return crypto.createHash("sha256").update(`${process.env.VERCEL_PROJECT_ID || process.env.VERCEL_URL || "session-v1"}:token`).digest("hex");
    }
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(SECRET_FILE)) {
        const existing = fs.readFileSync(SECRET_FILE, "utf8").trim();
        if (existing.length >= 32) return existing;
      }
      const generated = crypto.randomBytes(32).toString("hex");
      fs.writeFileSync(SECRET_FILE, generated, { encoding: "utf8", mode: 384 });
      return generated;
    } catch {
      return crypto.createHash("sha256").update(`${process.cwd()}:tk-alwashliyah-session-v1`).digest("hex");
    }
  }
  const TOKEN_SECRET = loadOrCreateSessionSecret();
  const revokedTokens = /* @__PURE__ */ new Set();
  let memoryDbCache = null;
  let dbVersion = Date.now();
  let lastLocalMutationAt = 0;
  let lastGasHydrateAt = 0;
  let gasHydrationPromise = null;
  let gasSyncRunning = null;
  let pendingGasSyncDb = null;
  let syncStatus = {
    connected: false,
    lastSyncAt: null,
    lastError: null,
    schoolName: null,
    syncedVersion: 0
  };
  function readDefaultGasUrl() {
    if (options.defaultGasUrl && isAllowedGasUrl(options.defaultGasUrl)) {
      return options.defaultGasUrl.trim();
    }
    const fromEnv = process.env.GAS_WEBAPP_URL?.trim();
    if (isAllowedGasUrl(fromEnv)) return fromEnv;
    const candidates = [
      path.resolve(process.cwd(), "config.js"),
      path.resolve(process.cwd(), "dist", "config.js"),
      path.resolve(process.cwd(), "public", "config.js")
    ];
    for (const filePath of candidates) {
      try {
        if (!fs.existsSync(filePath)) continue;
        const content = fs.readFileSync(filePath, "utf8");
        const match = content.match(
          /GAS_WEBAPP_URL\s*:\s*["'](https:\/\/script\.google\.com\/[^"']+)["']/
        );
        if (match?.[1] && isAllowedGasUrl(match[1])) {
          return match[1].trim();
        }
      } catch {
      }
    }
    return "";
  }
  function applyDefaultGasUrl(db) {
    const fallbackUrl = readDefaultGasUrl();
    const currentUrl = String(db.pengaturanSekolah?.gas_webapp_url || "").trim();
    const shouldReplace = Boolean(fallbackUrl) && (!isAllowedGasUrl(currentUrl) || LEGACY_BROKEN_GAS_URLS.has(currentUrl));
    if (shouldReplace) {
      return {
        ...db,
        pengaturanSekolah: {
          ...db.pengaturanSekolah,
          gas_webapp_url: fallbackUrl
        }
      };
    }
    return db;
  }
  let dbMutationQueue = Promise.resolve();
  function enqueueDbMutation(fn) {
    const next = dbMutationQueue.then(
      () => fn(),
      () => fn()
    );
    dbMutationQueue = next.then(
      () => void 0,
      () => void 0
    );
    return next;
  }
  function readDb() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (!fs.existsSync(DB_FILE)) {
        let seed = memoryDbCache;
        if (!seed && !options.dataDir) {
          const bundledDbPath = path.resolve(process.cwd(), "data", "db.json");
          if (fs.existsSync(bundledDbPath)) {
            try {
              seed = JSON.parse(fs.readFileSync(bundledDbPath, "utf8"));
            } catch {
              seed = null;
            }
          }
        }
        if (!seed) {
          seed = createInitialSeedDatabase();
        }
        seed = applyDefaultGasUrl(normalizeSchoolDatabase(seed));
        memoryDbCache = seed;
        fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2), "utf8");
        return seed;
      }
      const raw = fs.readFileSync(DB_FILE, "utf8");
      const parsed = applyDefaultGasUrl(
        normalizeSchoolDatabase(JSON.parse(raw))
      );
      memoryDbCache = parsed;
      return parsed;
    } catch {
      if (!memoryDbCache) {
        memoryDbCache = applyDefaultGasUrl(normalizeSchoolDatabase(createInitialSeedDatabase()));
      }
      return memoryDbCache;
    }
  }
  function writeDb(db, markMutation = true) {
    const normalized = applyDefaultGasUrl(normalizeSchoolDatabase(db));
    dbVersion = Math.max(Date.now(), dbVersion + 1);
    if (markMutation) {
      lastLocalMutationAt = Date.now();
    }
    memoryDbCache = normalized;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tmpFile = `${DB_FILE}.${process.pid}.${Math.random().toString(36).slice(2, 7)}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(normalized, null, 2), "utf8");
      fs.renameSync(tmpFile, DB_FILE);
    } catch {
    }
  }
  function issueSignedToken(user) {
    const payloadObj = {
      user,
      expiresAt: Date.now() + 1e3 * 60 * 60 * 12
    };
    const payloadB64 = Buffer.from(JSON.stringify(payloadObj), "utf8").toString("base64url");
    const sig = crypto.createHmac("sha256", TOKEN_SECRET).update(payloadB64).digest("base64url");
    return `${payloadB64}.${sig}`;
  }
  function verifySignedToken(token) {
    if (!token || revokedTokens.has(token)) return null;
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [payloadB64, sig] = parts;
    const expectedSig = crypto.createHmac("sha256", TOKEN_SECRET).update(payloadB64).digest("base64url");
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
    try {
      const parsed = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
      if (!parsed?.user || !parsed.expiresAt || Date.now() > parsed.expiresAt) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }
  function getAuthContext(req) {
    const auth = req.headers.authorization;
    if (auth && auth.startsWith("Bearer ")) {
      const bearerToken = auth.slice(7).trim();
      const session = verifySignedToken(bearerToken);
      if (session) {
        return { session, token: bearerToken, source: "bearer" };
      }
    }
    const cookies = parseCookies(req);
    const cookieToken = cookies[SESSION_COOKIE_NAME];
    if (cookieToken) {
      if (!isCsrfSafeForCookieMutation(req)) {
        return null;
      }
      const session = verifySignedToken(cookieToken);
      if (session) {
        return { session, token: cookieToken, source: "cookie" };
      }
    }
    return null;
  }
  function getAuthenticatedSession(req) {
    return getAuthContext(req)?.session ?? null;
  }
  async function defaultCallGasBridge(gasUrl, syncKey, action, payload = {}) {
    const effectiveUrl = isAllowedGasUrl(gasUrl) ? gasUrl.trim() : readDefaultGasUrl();
    if (!isAllowedGasUrl(effectiveUrl)) {
      return {
        ok: false,
        error: "URL Web App harus menggunakan alamat resmi https://script.google.com/macros/s/.../exec"
      };
    }
    try {
      const controller = new AbortController();
      const timeoutMs = action === "syncFullDb" ? 25e3 : 9e3;
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(effectiveUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action,
          syncKey: syncKey || "WASHLIYAH_SYNC_2026",
          payload
        }),
        redirect: "follow",
        signal: controller.signal
      });
      clearTimeout(timer);
      const text = await res.text();
      if (text.trim().startsWith("<")) {
        return {
          ok: false,
          error: 'Google Apps Script mengembalikan halaman HTML. Pastikan Deploy Web App menggunakan "Who has access: Anyone" dan versi deployment terbaru.'
        };
      }
      return JSON.parse(text);
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Gagal menghubungi Google Apps Script."
      };
    }
  }
  const callGasBridge = options.gasBridgeFn || defaultCallGasBridge;
  async function executeGasSyncOnce(db) {
    const rawUrl = db.pengaturanSekolah.gas_webapp_url;
    const url = isAllowedGasUrl(rawUrl) ? rawUrl.trim() : "";
    if (!isAllowedGasUrl(url)) {
      if (!db.pengaturanSekolah.google_spreadsheet_id?.trim()) {
        syncStatus = {
          ...syncStatus,
          connected: false,
          lastError: null
        };
      }
      return;
    }
    const syncKey = db.pengaturanSekolah.gas_sync_key || "WASHLIYAH_SYNC_2026";
    const res = await callGasBridge(url, syncKey, "syncFullDb", db);
    if (res.ok) {
      lastGasHydrateAt = Date.now();
      syncStatus = {
        connected: true,
        lastSyncAt: (/* @__PURE__ */ new Date()).toISOString(),
        lastError: null,
        schoolName: db.pengaturanSekolah.nama_sekolah,
        syncedVersion: dbVersion
      };
    } else {
      syncStatus = {
        ...syncStatus,
        connected: false,
        lastError: res.error || "Gagal menyinkronkan ke Google Sheets."
      };
    }
  }
  async function triggerAutoSyncToSheets(db) {
    const url = isAllowedGasUrl(db.pengaturanSekolah.gas_webapp_url) ? db.pengaturanSekolah.gas_webapp_url.trim() : "";
    if (!isAllowedGasUrl(url)) {
      if (!db.pengaturanSekolah.google_spreadsheet_id?.trim()) {
        syncStatus = {
          ...syncStatus,
          connected: false,
          lastError: null
        };
      }
      return;
    }
    pendingGasSyncDb = db;
    if (gasSyncRunning) {
      await gasSyncRunning;
      return;
    }
    gasSyncRunning = (async () => {
      try {
        while (pendingGasSyncDb) {
          const nextSnapshot = pendingGasSyncDb;
          pendingGasSyncDb = null;
          await executeGasSyncOnce(nextSnapshot);
        }
      } finally {
        gasSyncRunning = null;
      }
    })();
    await gasSyncRunning;
  }
  async function ensureDbHydrated(forceRefresh = false) {
    const current = readDb();
    const gasUrl = (isAllowedGasUrl(current.pengaturanSekolah.gas_webapp_url) ? current.pengaturanSekolah.gas_webapp_url.trim() : "") || readDefaultGasUrl();
    if (!isAllowedGasUrl(gasUrl)) {
      return;
    }
    const now = Date.now();
    const minInterval = forceRefresh ? FORCE_HYDRATE_MIN_INTERVAL_MS : HYDRATE_TTL_MS;
    if (lastGasHydrateAt > 0 && now - lastGasHydrateAt < minInterval) {
      return;
    }
    if (gasHydrationPromise) {
      await gasHydrationPromise;
      return;
    }
    const requestStartedAt = Date.now();
    gasHydrationPromise = (async () => {
      try {
        const latestLocal = readDb();
        const syncKey = process.env.GAS_SYNC_KEY?.trim() || latestLocal.pengaturanSekolah.gas_sync_key || "WASHLIYAH_SYNC_2026";
        const pulled = await callGasBridge(gasUrl, syncKey, "pullFullDb");
        if (lastLocalMutationAt > requestStartedAt) {
          lastGasHydrateAt = Date.now();
          return;
        }
        if (pulled.ok && pulled.data && Array.isArray(pulled.data.users)) {
          const mergeRes = mergePulledGasDatabase(latestLocal, pulled.data, {
            gasUrl,
            syncKey
          });
          if (mergeRes.adoptedRemote) {
            writeDb(mergeRes.db, false);
          } else if (mergeRes.db.pengaturanSekolah.gas_webapp_url !== latestLocal.pengaturanSekolah.gas_webapp_url) {
            writeDb(mergeRes.db, false);
          }
          syncStatus = {
            ...syncStatus,
            connected: true,
            lastSyncAt: syncStatus.lastSyncAt || (/* @__PURE__ */ new Date()).toISOString(),
            lastError: null,
            schoolName: mergeRes.db.pengaturanSekolah.nama_sekolah
          };
          lastGasHydrateAt = Date.now();
          if (mergeRes.shouldBootstrapRemote) {
            void triggerAutoSyncToSheets(mergeRes.db);
          }
        }
      } catch {
      } finally {
        gasHydrationPromise = null;
      }
    })();
    await gasHydrationPromise;
  }
  const app2 = express();
  app2.set("trust proxy", true);
  app2.use(express.json({ limit: "15mb" }));
  app2.get("/api/health", (_req, res) => {
    res.json({ ok: true, vercel: IS_VERCEL });
  });
  app2.get("/api/school-info", async (req, res) => {
    const preDb = readDb();
    if (!isAdminClaimedDb(preDb)) {
      await ensureDbHydrated();
    } else {
      void ensureDbHydrated();
    }
    const db = readDb();
    const authCtx = getAuthContext(req);
    const liveUser = authCtx ? db.users.find((u) => u.user_id === authCtx.session.user.user_id) : null;
    const authenticated = Boolean(liveUser && isUserActive(liveUser));
    const { gas_sync_key: _hidden, ...publicCfg } = db.pengaturanSekolah;
    res.json({
      ok: true,
      authenticated,
      pengaturanSekolah: publicCfg,
      adminClaimed: isAdminClaimedDb(db),
      sheetsConfigured: isAllowedGasUrl(db.pengaturanSekolah.gas_webapp_url) || Boolean(db.pengaturanSekolah.google_spreadsheet_id?.trim()),
      dbVersion,
      syncStatus
    });
  });
  app2.get("/api/sync-status", async (req, res) => {
    const preDb = readDb();
    if (!isAdminClaimedDb(preDb)) {
      await ensureDbHydrated();
    } else {
      void ensureDbHydrated();
    }
    const session = getAuthenticatedSession(req);
    if (!session) {
      res.status(401).json({ ok: false, error: "Silakan masuk terlebih dahulu." });
      return;
    }
    const db = readDb();
    const liveUser = db.users.find((u) => u.user_id === session.user.user_id);
    if (!liveUser || !isUserActive(liveUser)) {
      clearSessionCookie(req, res);
      res.status(401).json({ ok: false, error: "Akun tidak aktif atau telah dihapus." });
      return;
    }
    res.json({
      ok: true,
      dbVersion,
      syncStatus
    });
  });
  app2.post("/api/setup-admin", async (req, res) => {
    await ensureDbHydrated(true);
    const { username, password, nama_lengkap, no_hp } = req.body || {};
    const cleanUser = normalizeUsernameStr(username);
    const cleanNama = String(nama_lengkap || "").trim();
    const cleanPass = String(password || "").replace(/[\r\n]+/g, "");
    if (!/^[a-z0-9._-]{3,32}$/.test(cleanUser)) {
      res.status(400).json({
        ok: false,
        error: "Username 3\u201332 karakter (hanya huruf kecil, angka, titik, garis bawah, atau tanda hubung)."
      });
      return;
    }
    if (cleanNama.length < 2) {
      res.status(400).json({ ok: false, error: "Nama lengkap minimal 2 karakter." });
      return;
    }
    if (cleanPass.length < 6) {
      res.status(400).json({ ok: false, error: "Password minimal 6 karakter." });
      return;
    }
    const outcome = await enqueueDbMutation(async () => {
      const db = readDb();
      if (isAdminClaimedDb(db)) {
        return {
          status: 403,
          error: "Akun Admin sekolah sudah terdaftar. Pendaftaran Admin hanya dapat dilakukan satu kali."
        };
      }
      if (db.users.some((u) => normalizeUsernameStr(u.username) === cleanUser)) {
        return { status: 409, error: "Username sudah dipakai akun lain, pilih username lain." };
      }
      const adminUser = {
        user_id: `USR-ADM-${Date.now().toString().slice(-5)}`,
        username: cleanUser,
        password_hash: hashPasswordScrypt(cleanPass),
        role: "Admin",
        nama_lengkap: cleanNama,
        no_hp: String(no_hp || "").trim(),
        kelas_ampu: "",
        status_aktif: true
      };
      db.users = [adminUser, ...db.users.filter((u) => u.role !== "Admin")];
      db.pengaturanSekolah = {
        ...db.pengaturanSekolah,
        admin_claimed: true
      };
      writeDb(db);
      await triggerAutoSyncToSheets(db);
      const safeUser = {
        user_id: adminUser.user_id,
        username: adminUser.username,
        role: adminUser.role,
        nama_lengkap: adminUser.nama_lengkap,
        no_hp: adminUser.no_hp,
        kelas_ampu: adminUser.kelas_ampu,
        status_aktif: adminUser.status_aktif
      };
      const token = issueSignedToken(safeUser);
      return { status: 200, token, safeUser, db };
    });
    if (outcome.status !== 200) {
      res.status(outcome.status).json({ ok: false, adminClaimed: outcome.status === 403, error: outcome.error });
      return;
    }
    setSessionCookie(req, res, outcome.token);
    res.json({
      ok: true,
      token: outcome.token,
      user: outcome.safeUser,
      adminClaimed: true,
      data: sanitizeDbForRole(outcome.db, "Admin"),
      dbVersion,
      syncStatus
    });
  });
  app2.post("/api/register", (_req, res) => {
    res.status(403).json({
      ok: false,
      error: "Pendaftaran akun baru ditutup. Akun Guru dan Orang Tua hanya dibuatkan oleh Admin sekolah."
    });
  });
  app2.post("/api/admin/users", async (req, res) => {
    const session = getAuthenticatedSession(req);
    if (!session || session.user.role !== "Admin") {
      res.status(403).json({ ok: false, error: "Hanya Admin yang dapat membuat akun baru." });
      return;
    }
    const { username, password, nama_lengkap, role, no_hp, kelas_ampu } = req.body || {};
    if (role === "Admin") {
      res.status(403).json({ ok: false, error: "Hanya diperbolehkan satu akun Admin sekolah." });
      return;
    }
    const cleanUser = normalizeUsernameStr(username);
    const cleanNama = String(nama_lengkap || "").trim();
    const cleanPass = String(password || "").replace(/[\r\n]+/g, "");
    if (!/^[a-z0-9._-]{3,32}$/.test(cleanUser)) {
      res.status(400).json({
        ok: false,
        error: "Username 3\u201332 karakter (huruf kecil, angka, titik, garis bawah, atau tanda hubung)."
      });
      return;
    }
    if (cleanNama.length < 2) {
      res.status(400).json({ ok: false, error: "Nama lengkap minimal 2 karakter." });
      return;
    }
    if (cleanPass.length < 6) {
      res.status(400).json({ ok: false, error: "Password minimal 6 karakter." });
      return;
    }
    const outcome = await enqueueDbMutation(async () => {
      const db = readDb();
      if (db.users.some((u) => normalizeUsernameStr(u.username) === cleanUser)) {
        return { conflict: true };
      }
      const allowedRole = role === "Guru" ? "Guru" : "OrangTua";
      const cleanKelasAmpu = allowedRole === "Guru" ? String(kelas_ampu || "").trim().slice(0, 60) || "Kelas A" : "";
      const newUser = {
        user_id: `USR-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`,
        username: cleanUser,
        password_hash: hashPasswordScrypt(cleanPass),
        role: allowedRole,
        nama_lengkap: cleanNama,
        no_hp: String(no_hp || "").trim(),
        kelas_ampu: cleanKelasAmpu,
        status_aktif: true
      };
      db.users.push(newUser);
      writeDb(db);
      await triggerAutoSyncToSheets(db);
      return { conflict: false, newUser };
    });
    if (outcome.conflict) {
      res.status(409).json({ ok: false, error: "Username sudah dipakai akun lain." });
      return;
    }
    res.json({ ok: true, user: outcome.newUser, dbVersion, syncStatus });
  });
  app2.delete("/api/admin/users", async (req, res) => {
    const session = getAuthenticatedSession(req);
    if (!session || session.user.role !== "Admin") {
      res.status(403).json({ ok: false, error: "Hanya Admin yang dapat menghapus akun pengguna." });
      return;
    }
    const rawId = req.body?.user_id ?? req.query?.user_id;
    const targetUserId = typeof rawId === "string" ? rawId.trim() : "";
    if (!targetUserId) {
      res.status(400).json({ ok: false, error: "ID akun pengguna wajib disertakan." });
      return;
    }
    const outcome = await enqueueDbMutation(async () => {
      const db = readDb();
      const target = db.users.find((u) => u.user_id === targetUserId);
      if (!target) {
        return { status: 404, error: "Akun pengguna tidak ditemukan." };
      }
      if (target.role === "Admin" || target.user_id === session.user.user_id) {
        return { status: 403, error: "Akun Admin sekolah tidak dapat dihapus." };
      }
      db.users = db.users.filter((u) => u.user_id !== targetUserId);
      db.siswa = db.siswa.map(
        (s) => s.ortu_user_id === targetUserId ? { ...s, ortu_user_id: "" } : s
      );
      db.riwayatKelas = db.riwayatKelas.map(
        (r) => r.wali_kelas_id === targetUserId ? { ...r, wali_kelas_id: "" } : r
      );
      writeDb(db);
      await triggerAutoSyncToSheets(db);
      return {
        status: 200,
        users: db.users,
        siswa: db.siswa,
        riwayatKelas: db.riwayatKelas
      };
    });
    if (outcome.status !== 200) {
      res.status(outcome.status).json({ ok: false, error: outcome.error });
      return;
    }
    res.json({
      ok: true,
      deletedUserId: targetUserId,
      users: outcome.users,
      siswa: outcome.siswa,
      riwayatKelas: outcome.riwayatKelas,
      dbVersion,
      syncStatus
    });
  });
  app2.post("/api/login", async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      res.status(400).json({ ok: false, error: "Username dan password wajib diisi." });
      return;
    }
    const cleanUser = normalizeUsernameStr(username);
    let db = readDb();
    const localMatch = db.users.find(
      (u) => normalizeUsernameStr(u.username) === cleanUser && isUserActive(u) && verifyPasswordFlexible(password, u.password_hash)
    );
    if (!localMatch) {
      await ensureDbHydrated(true);
      db = readDb();
    } else {
      void ensureDbHydrated();
    }
    const claimed = isAdminClaimedDb(db);
    const matchingByUsername = db.users.filter((u) => normalizeUsernameStr(u.username) === cleanUser);
    if (matchingByUsername.length === 0) {
      const vercelEphemeralReset = IS_VERCEL && !claimed && !isAllowedGasUrl(readDefaultGasUrl());
      res.status(401).json({
        ok: false,
        adminClaimed: claimed,
        error: vercelEphemeralReset ? 'Akun belum tersimpan di sesi server Vercel ini. Silakan klik tab "Daftar Admin" atau hubungkan Google Sheets.' : "Username atau password tidak sesuai."
      });
      return;
    }
    const user = matchingByUsername.find(
      (u) => isUserActive(u) && verifyPasswordFlexible(password, u.password_hash)
    );
    if (!user) {
      const hasActive = matchingByUsername.some((u) => isUserActive(u));
      if (!hasActive) {
        res.status(403).json({
          ok: false,
          adminClaimed: claimed,
          error: "Akun Anda sedang dinonaktifkan oleh Admin sekolah."
        });
        return;
      }
      const missingHash = matchingByUsername.some((u) => isUserActive(u) && !u.password_hash);
      if (missingHash) {
        res.status(401).json({
          ok: false,
          adminClaimed: claimed,
          error: "Password akun belum tersinkron. Minta Admin mengatur ulang password di menu Siswa & akun."
        });
        return;
      }
      res.status(401).json({
        ok: false,
        adminClaimed: claimed,
        error: "Username atau password tidak sesuai."
      });
      return;
    }
    const safeUser = {
      user_id: user.user_id,
      username: user.username,
      role: user.role,
      nama_lengkap: user.nama_lengkap,
      no_hp: user.no_hp,
      kelas_ampu: user.kelas_ampu,
      status_aktif: isUserActive(user)
    };
    const token = issueSignedToken(safeUser);
    setSessionCookie(req, res, token);
    res.json({
      ok: true,
      token,
      user: safeUser,
      adminClaimed: claimed,
      data: sanitizeDbForRole(db, user.role),
      dbVersion,
      syncStatus
    });
  });
  app2.post("/api/logout", (req, res) => {
    const auth = req.headers.authorization;
    if (auth && auth.startsWith("Bearer ")) {
      revokedTokens.add(auth.slice(7).trim());
    }
    const cookies = parseCookies(req);
    if (cookies[SESSION_COOKIE_NAME]) {
      revokedTokens.add(cookies[SESSION_COOKIE_NAME]);
    }
    clearSessionCookie(req, res);
    res.json({ ok: true });
  });
  app2.post("/api/change-password", async (req, res) => {
    const authCtx = getAuthContext(req);
    if (!authCtx) {
      res.status(401).json({ ok: false, error: "Silakan masuk terlebih dahulu." });
      return;
    }
    const session = authCtx.session;
    const { lama, baru } = req.body || {};
    const cleanBaru = String(baru || "").replace(/[\r\n]+/g, "");
    if (!lama || cleanBaru.length < 6) {
      res.status(400).json({ ok: false, error: "Password baru minimal 6 karakter." });
      return;
    }
    const outcome = await enqueueDbMutation(async () => {
      const db = readDb();
      const idx = db.users.findIndex((u) => u.user_id === session.user.user_id);
      if (idx === -1) {
        return { status: 404, error: "Akun tidak ditemukan." };
      }
      if (!verifyPasswordFlexible(lama, db.users[idx].password_hash)) {
        return { status: 401, error: "Password lama tidak sesuai." };
      }
      db.users[idx] = { ...db.users[idx], password_hash: hashPasswordScrypt(cleanBaru) };
      writeDb(db);
      await triggerAutoSyncToSheets(db);
      return { status: 200 };
    });
    if (outcome.status !== 200) {
      res.status(outcome.status).json({ ok: false, error: outcome.error });
      return;
    }
    revokedTokens.add(authCtx.token);
    const newToken = issueSignedToken(session.user);
    setSessionCookie(req, res, newToken);
    res.json({ ok: true, token: newToken });
  });
  app2.get("/api/db", async (req, res) => {
    const preDb = readDb();
    if (!isAdminClaimedDb(preDb)) {
      await ensureDbHydrated();
    } else {
      void ensureDbHydrated();
    }
    const authCtx = getAuthContext(req);
    if (!authCtx) {
      res.status(401).json({ ok: false, error: "Silakan masuk terlebih dahulu." });
      return;
    }
    const db = readDb();
    const liveUser = db.users.find((u) => u.user_id === authCtx.session.user.user_id);
    if (!liveUser || !isUserActive(liveUser)) {
      clearSessionCookie(req, res);
      res.status(401).json({ ok: false, error: "Akun tidak aktif atau telah dihapus." });
      return;
    }
    const safeUser = {
      user_id: liveUser.user_id,
      username: liveUser.username,
      role: liveUser.role,
      nama_lengkap: liveUser.nama_lengkap,
      no_hp: liveUser.no_hp,
      kelas_ampu: liveUser.kelas_ampu,
      status_aktif: isUserActive(liveUser)
    };
    res.json({
      ok: true,
      token: authCtx.token,
      user: safeUser,
      adminClaimed: isAdminClaimedDb(db),
      data: sanitizeDbForRole(db, liveUser.role),
      dbVersion,
      syncStatus
    });
  });
  app2.put("/api/db", async (req, res) => {
    const session = getAuthenticatedSession(req);
    if (!session) {
      res.status(401).json({ ok: false, error: "Silakan masuk terlebih dahulu." });
      return;
    }
    const rawBody = req.body || {};
    const requestedGraduatedIds = Array.isArray(rawBody.graduatedSiswaIds) ? rawBody.graduatedSiswaIds.map((id) => String(id || "").trim()).filter(Boolean) : [];
    const { graduatedSiswaIds: _ignoredGradIds, ...incoming } = rawBody;
    if (!incoming || !incoming.pengaturanSekolah || !Array.isArray(incoming.siswa)) {
      res.status(400).json({ ok: false, error: "Format data JSON tidak valid." });
      return;
    }
    const nextDb = await enqueueDbMutation(async () => {
      const currentDb = readDb();
      const currentUserMap = new Map(currentDb.users.map((u) => [u.user_id, u]));
      const isAdmin = session.user.role === "Admin";
      const isGuru = session.user.role === "Guru";
      let nextUsers = currentDb.users;
      if (isAdmin && Array.isArray(incoming.users)) {
        const mappedUsers = incoming.users.map((u) => {
          const existing = currentUserMap.get(u.user_id);
          const cleanUname = normalizeUsernameStr(u.username) || existing?.username || "";
          const rawPw = typeof u.password === "string" ? u.password.replace(/[\r\n]+/g, "") : "";
          if (existing?.role === "Admin") {
            const { password: _pw2, ...rest2 } = u;
            return {
              ...rest2,
              username: cleanUname,
              role: "Admin",
              status_aktif: true,
              password_hash: rawPw.trim() ? hashPasswordScrypt(rawPw) : existing.password_hash
            };
          }
          const safeRole = u.role === "Guru" ? "Guru" : "OrangTua";
          if (rawPw.trim()) {
            const { password: _pw2, ...rest2 } = u;
            return {
              ...rest2,
              username: cleanUname,
              role: safeRole,
              password_hash: hashPasswordScrypt(rawPw)
            };
          }
          const { password: _pw, ...rest } = u;
          return {
            ...rest,
            username: cleanUname,
            role: safeRole,
            password_hash: u.password_hash || existing?.password_hash || ""
          };
        });
        const existingAdmins = currentDb.users.filter((u) => u.role === "Admin");
        for (const adm of existingAdmins) {
          if (!mappedUsers.some((u) => u.user_id === adm.user_id)) {
            mappedUsers.unshift(adm);
          }
        }
        nextUsers = mappedUsers;
      }
      let nextSiswa = currentDb.siswa;
      if (isAdmin) {
        nextSiswa = incoming.siswa;
      } else if (isGuru) {
        const incomingMap = new Map(incoming.siswa.map((s) => [s.siswa_id, s]));
        nextSiswa = currentDb.siswa.map((s) => incomingMap.get(s.siswa_id) || s);
      }
      const incomingGasRaw = typeof incoming.pengaturanSekolah.gas_webapp_url === "string" ? incoming.pengaturanSekolah.gas_webapp_url.trim() : void 0;
      const resolvedGasUrl = incomingGasRaw === "" ? "" : incomingGasRaw && isAllowedGasUrl(incomingGasRaw) ? incomingGasRaw : currentDb.pengaturanSekolah.gas_webapp_url || "";
      let mergedDb = normalizeSchoolDatabase({
        ...currentDb,
        ...isAdmin ? incoming : {},
        ...isGuru ? {
          antropometri: incoming.antropometri ?? currentDb.antropometri,
          literasi: incoming.literasi ?? currentDb.literasi,
          keagamaan: incoming.keagamaan ?? currentDb.keagamaan,
          logMateriHarian: incoming.logMateriHarian ?? currentDb.logMateriHarian,
          daftarHadir: incoming.daftarHadir ?? currentDb.daftarHadir,
          asesmenAnekdot: incoming.asesmenAnekdot ?? currentDb.asesmenAnekdot,
          asesmenHasilKarya: incoming.asesmenHasilKarya ?? currentDb.asesmenHasilKarya,
          asesmenCeklis: incoming.asesmenCeklis ?? currentDb.asesmenCeklis,
          riwayatKelas: incoming.riwayatKelas ?? currentDb.riwayatKelas,
          ulasanOrtu: incoming.ulasanOrtu ?? currentDb.ulasanOrtu
        } : {},
        ...session.user.role === "OrangTua" ? {
          kaihHarian: incoming.kaihHarian ?? currentDb.kaihHarian,
          kaihFotoBulanan: incoming.kaihFotoBulanan ?? currentDb.kaihFotoBulanan,
          ulasanOrtu: incoming.ulasanOrtu ?? currentDb.ulasanOrtu
        } : {},
        pengaturanSekolah: isAdmin ? {
          ...incoming.pengaturanSekolah,
          gas_webapp_url: resolvedGasUrl,
          admin_claimed: isAdminClaimedDb(currentDb) || Boolean(incoming.pengaturanSekolah.admin_claimed)
        } : currentDb.pengaturanSekolah,
        users: nextUsers,
        siswa: nextSiswa
      });
      const approvedPurgeIds = /* @__PURE__ */ new Set();
      if (isAdmin) {
        for (const id of requestedGraduatedIds) approvedPurgeIds.add(id);
        for (const s of mergedDb.siswa) {
          if (s.status_siswa === "Lulus" || s.kelas_aktif === "Lulus") {
            approvedPurgeIds.add(s.siswa_id);
          }
        }
      } else if (isGuru) {
        const currentSiswaMap = new Map(currentDb.siswa.map((s) => [s.siswa_id, s]));
        const incomingSiswaMap = new Map(incoming.siswa.map((s) => [s.siswa_id, s]));
        for (const id of requestedGraduatedIds) {
          const existing = currentSiswaMap.get(id);
          if (!existing) continue;
          const inc = incomingSiswaMap.get(id);
          const canGraduate = existing.status_siswa === "Lulus" || existing.kelas_aktif === "Lulus" || existing.keputusan_kenaikan === "LULUS_KE_SD" || inc?.keputusan_kenaikan === "LULUS_KE_SD" || inc?.status_siswa === "Lulus" || inc?.kelas_aktif === "Lulus" || getNextClassTarget(currentDb, existing.kelas_aktif).isFinal;
          if (canGraduate) {
            approvedPurgeIds.add(id);
          }
        }
        for (const s of mergedDb.siswa) {
          if (s.status_siswa === "Lulus" || s.kelas_aktif === "Lulus") {
            approvedPurgeIds.add(s.siswa_id);
          }
        }
      }
      if (approvedPurgeIds.size > 0) {
        mergedDb = purgeStudentsFromDatabase(mergedDb, approvedPurgeIds);
      }
      writeDb(mergedDb);
      await triggerAutoSyncToSheets(mergedDb);
      return mergedDb;
    });
    res.json({
      ok: true,
      data: sanitizeDbForRole(nextDb, session.user.role),
      dbVersion,
      syncStatus
    });
  });
  app2.post("/api/sheets/oauth-sync", (req, res) => {
    const session = getAuthenticatedSession(req);
    if (!session) {
      res.status(401).json({ ok: false, error: "Silakan masuk terlebih dahulu." });
      return;
    }
    const { ok: syncOk, schoolName, syncedVersion, error } = req.body || {};
    const db = readDb();
    if (syncOk) {
      syncStatus = {
        connected: true,
        lastSyncAt: (/* @__PURE__ */ new Date()).toISOString(),
        lastError: null,
        schoolName: schoolName || db.pengaturanSekolah.nama_sekolah,
        syncedVersion: typeof syncedVersion === "number" ? syncedVersion : dbVersion
      };
    } else {
      syncStatus = {
        ...syncStatus,
        lastError: error || "Gagal sinkronisasi ke Google Sheets."
      };
    }
    res.json({ ok: true, dbVersion, syncStatus });
  });
  app2.post("/api/sheets/test", async (req, res) => {
    const session = getAuthenticatedSession(req);
    if (!session || session.user.role !== "Admin") {
      res.status(403).json({ ok: false, error: "Hanya Admin yang dapat menguji koneksi." });
      return;
    }
    const { url, syncKey } = req.body || {};
    const db = readDb();
    const targetUrl = (isAllowedGasUrl(url) ? url.trim() : "") || db.pengaturanSekolah.gas_webapp_url || readDefaultGasUrl();
    const targetKey = syncKey || db.pengaturanSekolah.gas_sync_key || "WASHLIYAH_SYNC_2026";
    const result = await callGasBridge(targetUrl, targetKey, "ping");
    if (result.ok) {
      if (targetUrl && db.pengaturanSekolah.gas_webapp_url !== targetUrl) {
        db.pengaturanSekolah.gas_webapp_url = targetUrl;
        db.pengaturanSekolah.gas_sync_key = targetKey;
        writeDb(db);
      }
      syncStatus = {
        connected: true,
        lastSyncAt: (/* @__PURE__ */ new Date()).toISOString(),
        lastError: null,
        schoolName: result.school || db.pengaturanSekolah.nama_sekolah
      };
      res.json({ ok: true, result, syncStatus });
    } else {
      syncStatus = {
        ...syncStatus,
        connected: false,
        lastError: result.error || "Koneksi gagal."
      };
      res.status(400).json({ ok: false, error: result.error, syncStatus });
    }
  });
  app2.post("/api/sheets/push", async (req, res) => {
    const session = getAuthenticatedSession(req);
    if (!session || session.user.role !== "Admin") {
      res.status(403).json({ ok: false, error: "Hanya Admin yang dapat mengirim data ke Sheet." });
      return;
    }
    const { url, syncKey, dbSnapshot } = req.body || {};
    const currentDb = readDb();
    let effectiveDb = currentDb;
    if (dbSnapshot && dbSnapshot.pengaturanSekolah && Array.isArray(dbSnapshot.siswa)) {
      const currentUserMap = new Map(currentDb.users.map((u) => [u.user_id, u]));
      const mergedUsers = Array.isArray(dbSnapshot.users) ? dbSnapshot.users.map((u) => {
        const existing = currentUserMap.get(u.user_id);
        return {
          ...u,
          password_hash: existing?.password_hash || u.password_hash || ""
        };
      }) : currentDb.users;
      effectiveDb = normalizeSchoolDatabase({
        ...currentDb,
        ...dbSnapshot,
        users: mergedUsers,
        pengaturanSekolah: {
          ...currentDb.pengaturanSekolah,
          ...dbSnapshot.pengaturanSekolah,
          admin_claimed: isAdminClaimedDb(currentDb) || Boolean(dbSnapshot.pengaturanSekolah.admin_claimed)
        }
      });
    }
    const targetUrl = (isAllowedGasUrl(url) ? url.trim() : "") || effectiveDb.pengaturanSekolah.gas_webapp_url || readDefaultGasUrl();
    const targetKey = syncKey || effectiveDb.pengaturanSekolah.gas_sync_key || "WASHLIYAH_SYNC_2026";
    if (targetUrl) {
      effectiveDb.pengaturanSekolah = {
        ...effectiveDb.pengaturanSekolah,
        gas_webapp_url: targetUrl,
        gas_sync_key: targetKey
      };
    }
    writeDb(effectiveDb);
    const result = await callGasBridge(targetUrl, targetKey, "syncFullDb", effectiveDb);
    if (result.ok) {
      lastGasHydrateAt = Date.now();
      syncStatus = {
        connected: true,
        lastSyncAt: (/* @__PURE__ */ new Date()).toISOString(),
        lastError: null,
        schoolName: effectiveDb.pengaturanSekolah.nama_sekolah
      };
      res.json({ ok: true, syncStatus });
    } else {
      syncStatus = {
        ...syncStatus,
        connected: false,
        lastError: result.error || "Gagal mengirim ke Google Sheets."
      };
      res.status(400).json({ ok: false, error: syncStatus.lastError, syncStatus });
    }
  });
  app2.post("/api/sheets/pull", async (req, res) => {
    const session = getAuthenticatedSession(req);
    if (!session || session.user.role !== "Admin") {
      res.status(403).json({ ok: false, error: "Hanya Admin yang dapat menarik data dari Sheet." });
      return;
    }
    const { url, syncKey } = req.body || {};
    const db = readDb();
    const targetUrl = (isAllowedGasUrl(url) ? url.trim() : "") || db.pengaturanSekolah.gas_webapp_url || readDefaultGasUrl();
    const targetKey = db.pengaturanSekolah.gas_sync_key || syncKey || "WASHLIYAH_SYNC_2026";
    const result = await callGasBridge(targetUrl, targetKey, "pullFullDb");
    if (!result.ok || !result.data) {
      res.status(400).json({ ok: false, error: result.error || "Gagal menarik data dari Google Sheets." });
      return;
    }
    const mergedRes = mergePulledGasDatabase(db, result.data, {
      gasUrl: targetUrl,
      syncKey: targetKey,
      forceRemote: true
    });
    writeDb(mergedRes.db);
    lastGasHydrateAt = Date.now();
    syncStatus = {
      connected: true,
      lastSyncAt: (/* @__PURE__ */ new Date()).toISOString(),
      lastError: null,
      schoolName: mergedRes.db.pengaturanSekolah.nama_sekolah
    };
    res.json({ ok: true, data: mergedRes.db, syncStatus });
  });
  return app2;
}

// server/vercel-entry.ts
var app = createApiApp();
function createVercelHandler(fixedPath) {
  return function handler(req, res) {
    if (fixedPath) {
      const rawUrl = req.url || "/";
      const qIdx = rawUrl.indexOf("?");
      const qs = qIdx !== -1 ? rawUrl.slice(qIdx) : "";
      req.url = `${fixedPath}${qs}`;
    } else if (req.url) {
      try {
        const parsed = new URL(req.url, "http://localhost");
        const rewrittenPath = parsed.searchParams.get("__path");
        if (rewrittenPath !== null) {
          parsed.searchParams.delete("__path");
          const cleanSubPath = rewrittenPath.replace(/^\/+/, "");
          const qs = parsed.searchParams.toString();
          req.url = `/api/${cleanSubPath}${qs ? `?${qs}` : ""}`;
        }
      } catch {
      }
    }
    return app(req, res);
  };
}
var vercel_entry_default = createVercelHandler();
export {
  createVercelHandler,
  vercel_entry_default as default
};
