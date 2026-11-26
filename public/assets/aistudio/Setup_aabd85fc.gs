/** Setup database. Jalankan setupDatabase() satu kali dari editor Apps Script. */

var SKEMA = {
  PengaturanSekolah: ['key','value','keterangan'],
  Users: ['user_id','username','password_hash','role','nama_lengkap','no_hp','status_aktif'],
  TahunAjaran: ['ta_id','nama_ta','tanggal_mulai','tanggal_selesai','status_aktif'],
  Siswa: ['siswa_id','nis','nama_anak','jenis_kelamin','tanggal_lahir','ortu_user_id','kelas_aktif','status_siswa','target_literasi_kelas_b'],
  RiwayatKelas: ['riwayat_id','siswa_id','ta_id','kelas','wali_kelas_id','status_akhir'],
  Antropometri: ['log_id','siswa_id','ta_id','periode_bulan','usia_bulan','bb_kg','tb_cm','lk_cm','lila_cm','status_gizi_otomatis','kode_pemicu_tips','catatan_guru','updated_at'],
  Literasi: ['lit_id','siswa_id','ta_id','periode_bulan','kelas','track_level_dipilih','target_kustom','nilai_huruf_atau_dasar','nilai_sukukata_atau_lanjutan','nilai_kalimat_opsional','catatan_guru','updated_at'],
  Keagamaan: ['agama_id','siswa_id','ta_id','periode_bulan','kategori','materi_id','nama_materi','status_progres','catatan_guru','updated_at'],
  KAIH_Bulanan: ['kaih_id','siswa_id','ta_id','periode_bulan','bangun_pagi','beribadah','berolahraga','makan_sehat','gemar_belajar','bermasyarakat','tidur_cepat','catatan_ortu','foto_drive_id','foto_url','updated_at'],
  UlasanOrtu: ['ulasan_id','siswa_id','ta_id','periode_bulan','pengirim_role','pengirim_nama','isi_pesan','created_at'],
  Master_Materi: ['materi_id','kategori','nama_materi','urutan','aktif'],
  Master_Tips: ['tips_id','kategori_pemicu','kondisi_pemicu','judul_tips','isi_tips_ayah_bunda','aktif']
};

var NAMA_FOLDER_FOTO = 'Foto_KAIH_TK_IT_AL_WASHLIYAH';

function setupDatabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SKEMA).forEach(function (nama) {
    var sh = ss.getSheetByName(nama) || ss.insertSheet(nama);
    var kol = SKEMA[nama];
    // Format teks mencegah "2026-11" atau nomor HP diubah otomatis oleh Sheets.
    sh.getRange(1, 1, sh.getMaxRows(), kol.length).setNumberFormat('@');
    sh.getRange(1, 1, 1, kol.length).setValues([kol]).setFontWeight('bold').setBackground('#dcebdc');
    sh.setFrozenRows(1);
  });
  seedPengaturan_();
  seedMateri_();
  seedTips_();
  seedDataUji_();
  return 'Setup selesai';
}

function isiJikaKosong_(nama, baris) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nama);
  if (sh.getLastRow() > 1 || !baris.length) return;
  sh.getRange(2, 1, baris.length, baris[0].length).setValues(baris);
}

function folderFoto_() {
  var it = DriveApp.getFoldersByName(NAMA_FOLDER_FOTO);
  return it.hasNext() ? it.next() : DriveApp.createFolder(NAMA_FOLDER_FOTO);
}

function seedPengaturan_() {
  isiJikaKosong_('PengaturanSekolah', [
    ['nama_sekolah', 'TK IT AL-WASHLIYAH', 'Nama lembaga'],
    ['tahun_ajaran_aktif', 'TA2026', 'ta_id yang sedang berjalan'],
    ['folder_drive_id', folderFoto_().getId(), 'Folder foto 7 KAIH'],
    ['alamat_sekolah', '[Isi alamat sekolah]', 'Alamat pada kop rapor'],
    ['kontak_sekolah', '[Isi nomor kontak]', 'Telepon atau email sekolah'],
    ['wali_kelas_a', 'U002', 'user_id guru wali Kelas A'],
    ['wali_kelas_b', 'U003', 'user_id guru wali Kelas B']
  ]);
}

function seedMateri_() {
  var daftar = {
    SURAT: ['QS. Al-Fatihah','QS. An-Nas','QS. Al-Falaq','QS. Al-Ikhlas','QS. Al-Lahab','QS. An-Nasr','QS. Al-Kafirun','QS. Al-Kautsar','QS. Al-Ma\'un','QS. Quraisy','QS. Al-Fil','QS. Al-Asr','QS. At-Takatsur','QS. Al-Qari\'ah'],
    DOA: ['Doa Sebelum Belajar','Doa Sebelum Makan','Doa Sesudah Makan','Doa Untuk Kedua Orang Tua','Doa Sebelum Tidur','Doa Bangun Tidur','Doa Masuk Kamar Mandi','Doa Keluar Kamar Mandi','Doa Keluar Rumah','Doa Naik Kendaraan','Doa Kebaikan Dunia & Akhirat','Doa Bercermin','Doa Masuk Masjid','Doa Keluar Masjid'],
    IQRA: ['Pengenalan Huruf Hijaiyah Tunggal (Alif-Ya)','Iqra Jilid 1 (Harakat Fathah)','Iqra Jilid 2 (Huruf Sambung & Mad)','Iqra Jilid 3 (Kasrah, Dhammah & Mad)','Iqra Jilid 4 (Tanwin, Sukun & Qalqalah)','Iqra Jilid 5 (Alif Lam, Tasydid & Waqaf)','Iqra Jilid 6 (Tajwid Dasar & Persiapan Al-Qur\'an)'],
    HADITS: ['Hadits Kebersihan','Senyum adalah Sedekah','Hadits Kasih Sayang','Larangan Marah','Adab Makan & Minum','Menuntut Ilmu','Surga di Bawah Telapak Kaki Ibu','Sesama Muslim Bersaudara','Berkata Baik atau Diam','Keutamaan Belajar & Mengajarkan Al-Qur\'an']
  };
  var baris = [], n = 0;
  Object.keys(daftar).forEach(function (kat) {
    daftar[kat].forEach(function (nama, i) {
      baris.push(['M' + ('00' + (++n)).slice(-3), kat, nama, String(i + 1), 'YA']);
    });
  });
  isiJikaKosong_('Master_Materi', baris);
}

function seedTips_() {
  var t = [
    ['ANTRO_BB_KURANG','Tambah gizi sedikit demi sedikit','Tawarkan 3 kali makan utama dan 2 selingan padat gizi seperti telur, ikan, tempe, atau pisang. Konsultasikan ke Puskesmas atau Posyandu bila berat belum naik.'],
    ['ANTRO_BB_LEBIH','Gerak bersama, camilan lebih sehat','Ganti minuman manis dengan air putih, sediakan buah sebagai camilan, dan ajak anak bermain aktif setiap hari. Hindari diet ketat tanpa arahan tenaga kesehatan.'],
    ['ANTRO_TB_PENDEK','Dukung pertumbuhan tinggi badan','Utamakan protein hewani setiap hari, tidur yang cukup, dan periksakan pertumbuhan ke tenaga kesehatan untuk penilaian lebih lengkap.'],
    ['ANTRO_LILA_LK_PERHATIAN','Perlu pemeriksaan lanjutan','Hasil lingkar lengan atau lingkar kepala perlu dipastikan. Silakan ukur ulang di Posyandu, Puskesmas, atau dokter anak.'],
    ['ANTRO_TREN_STAGNAN','Pantau nafsu makan bulan ini','Berat badan belum bertambah dari bulan lalu. Perhatikan porsi makan, jam tidur, dan keluhan sakit. Konsultasikan bila berlanjut.'],
    ['ANTRO_NORMAL','Pertumbuhan sesuai, pertahankan','Lanjutkan makan beragam, aktivitas fisik, dan tidur teratur. Ukur rutin setiap bulan.'],
    ['LIT_A_HURUF_LOW','Kenalkan huruf lewat benda sekitar','Pilih 2 sampai 3 huruf per minggu. Cari bersama huruf itu pada kemasan makanan atau nama anggota keluarga.'],
    ['LIT_A_SUKUKATA_LOW','Bermain suku kata','Ucapkan ba-bi-bu sambil bertepuk. Susun kartu suku kata menjadi kata sederhana seperti ma-ma atau bu-ku.'],
    ['LIT_A_HIGH','Lanjutkan dengan membaca bersama','Bacakan buku cerita 10 menit setiap hari dan minta anak menunjuk huruf atau suku kata yang sudah dikenalnya.'],
    ['LIT_B_TRACK1_LOW','Perkuat huruf dan suku kata dasar','Latihan singkat 5 sampai 10 menit dengan kartu huruf. Puji setiap usaha, bukan hanya hasil.'],
    ['LIT_B_TRACK1_HIGH','Siap naik ke suku kata lanjutan','Mulai kenalkan kata dengan huruf mati di akhir seperti ma-kan dan ti-dur.'],
    ['LIT_B_TRACK2_LOW','Latih bunyi gabungan','Pilih satu pola per minggu, misalnya ng, ny, atau ai, lalu cari contohnya dalam buku cerita.'],
    ['LIT_B_TRACK2_HIGH','Coba kalimat pendek','Ajak anak membaca kalimat tiga kata dan menjelaskan artinya dengan bahasanya sendiri.'],
    ['LIT_B_TRACK3_LOW','Baca pelan, pahami bersama','Baca satu kalimat bergantian, lalu tanyakan siapa dan sedang apa.'],
    ['LIT_B_TRACK3_HIGH','Lanjut ke paragraf pendek','Pilih cerita 3 sampai 4 kalimat dan minta anak menceritakan bagian yang disukainya.'],
    ['LIT_B_TRACK4_LOW','Bantu menceritakan kembali','Setelah membaca, gunakan pertanyaan awal, tengah, dan akhir cerita sebagai panduan.'],
    ['LIT_B_TRACK4_HIGH','Jadikan anak pendongeng','Beri kesempatan anak membacakan cerita untuk keluarga dan membuat akhir cerita versinya.'],
    ['LIT_B_KUSTOM','Dampingi target pribadi','Lihat target dari guru pada laporan literasi, latih sedikit tetapi rutin, dan sampaikan perkembangannya lewat ulasan.'],
    ['KAIH_BANGUN_PAGI_LOW','Pagi yang lebih mudah','Majukan jam tidur 15 menit, buka tirai saat pagi, dan sambut anak dengan kegiatan yang ia sukai.'],
    ['KAIH_BERIBADAH_LOW','Beribadah bersama','Ajak anak shalat bersama tanpa paksaan, mulai dari satu waktu yang paling mudah, dan beri teladan.'],
    ['KAIH_BEROLAHRAGA_LOW','Bergerak sambil bermain','Sisihkan 30 menit untuk bersepeda, lompat tali, atau berjalan sore bersama.'],
    ['KAIH_MAKAN_SEHAT_LOW','Kenalkan makanan tanpa memaksa','Libatkan anak mencuci sayur atau menata piring. Sajikan porsi kecil untuk makanan baru.'],
    ['KAIH_GEMAR_BELAJAR_LOW','Belajar yang menyenangkan','Jadikan 10 menit sehari untuk membaca, berhitung benda, atau menjawab rasa ingin tahu anak.'],
    ['KAIH_BERMASYARAKAT_LOW','Latih bersosialisasi','Biasakan memberi salam kepada tetangga, berbagi, dan bermain bersama teman sebaya.'],
    ['KAIH_TIDUR_CEPAT_LOW','Rutinitas sebelum tidur','Matikan gawai 1 jam sebelum tidur, lalu sikat gigi, berdoa, dan membaca cerita dengan urutan tetap.'],
    ['KAIH_ALL_HIGH','Kebiasaan baik sudah terbentuk','Apresiasi anak secara spesifik dan pertahankan rutinitas keluarga yang sudah berjalan.'],
    ['AGAMA_SURAT_LOW','Murajaah surat pendek','Putar atau bacakan satu surat yang sama selama sepekan, terutama menjelang tidur.'],
    ['AGAMA_SURAT_HIGH','Jaga hafalan surat','Minta anak membaca surat yang sudah lancar saat shalat bersama.'],
    ['AGAMA_DOA_LOW','Doa pada waktunya','Ucapkan doa bersama tepat saat kegiatannya, misalnya sebelum makan.'],
    ['AGAMA_DOA_HIGH','Biarkan anak memimpin doa','Beri anak giliran memimpin doa di rumah.'],
    ['AGAMA_IQRA_LOW','Iqra sebentar tetapi rutin','Dampingi 5 sampai 10 menit setiap hari dan ulangi halaman terakhir sebelum melanjutkan.'],
    ['AGAMA_IQRA_HIGH','Pertahankan kelancaran Iqra','Ulangi halaman sebelumnya secara berkala agar bacaan tetap tepat.'],
    ['AGAMA_HADITS_LOW','Hadits lewat contoh nyata','Sebutkan satu hadits saat situasinya muncul, misalnya hadits senyum ketika menyambut tamu.'],
    ['AGAMA_HADITS_HIGH','Amalkan hadits yang dihafal','Ajak anak menceritakan satu perbuatan hari ini yang sesuai dengan haditsnya.']
  ];
  isiJikaKosong_('Master_Tips', t.map(function (r, i) {
    return ['T' + ('00' + (i + 1)).slice(-3), r[0].split('_')[0], r[0], r[1], r[2], 'YA'];
  }));
}

function seedDataUji_() {
  var kini = new Date().toISOString();
  var bln = periodeKini_();
  isiJikaKosong_('Users', [
    ['U001','admin',buatHash_('Admin#123'),'ADMIN','Admin Sekolah (contoh)','','YA'],
    ['U002','guru.a',buatHash_('Guru#123'),'GURU','Ustazah Aisyah (contoh)','','YA'],
    ['U003','guru.b',buatHash_('Guru#123'),'GURU','Ustazah Fatimah (contoh)','','YA'],
    ['U004','ortu.hasan',buatHash_('Ortu#123'),'ORTU','Orang Tua Hasan (contoh)','','YA'],
    ['U005','ortu.zahra',buatHash_('Ortu#123'),'ORTU','Orang Tua Zahra (contoh)','','YA']
  ]);
  isiJikaKosong_('TahunAjaran', [['TA2026','2026/2027','2026-07-13','2027-06-26','YA']]);
  isiJikaKosong_('Siswa', [
    ['S001','CONTOH-001','Hasan (contoh)','L','2021-09-10','U004','Kelas A','Aktif',''],
    ['S002','CONTOH-002','Zahra (contoh)','P','2020-08-22','U005','Kelas B','Aktif','TRACK_2']
  ]);
  isiJikaKosong_('RiwayatKelas', [
    ['R001','S001','TA2026','Kelas A','U002','Berjalan'],
    ['R002','S002','TA2026','Kelas B','U003','Berjalan']
  ]);
  var antro = [], lalu = [geserBulan_(bln, -2), geserBulan_(bln, -1), bln];
  [['S001','L','2021-09-10',[16.1,16.4,16.7],[103,103.6,104.3],50,15.6],
   ['S002','P','2020-08-22',[18.2,18.4,18.4],[110,110.5,111],50,16]].forEach(function (s) {
    lalu.forEach(function (p, i) {
      var usia = usiaBulan_(s[2], p);
      var h = analisisAntro_(s[1], usia, s[3][i], s[4][i], s[5], s[6], i ? s[3][i - 1] : null);
      antro.push(['AN' + s[0] + i, s[0], 'TA2026', p, String(usia), String(s[3][i]), String(s[4][i]), String(s[5]), String(s[6]), h.status, h.kode, 'Data contoh.', kini]);
    });
  });
  isiJikaKosong_('Antropometri', antro);
  isiJikaKosong_('Literasi', [
    ['L001','S001','TA2026',bln,'Kelas A','','','BSH','MB','','Sudah mengenal sebagian besar huruf.',kini],
    ['L002','S002','TA2026',bln,'Kelas B','TRACK_2','','BSH','BSH','','Mulai lancar membaca suku kata KVK.',kini]
  ]);
  isiJikaKosong_('Keagamaan', [
    ['G001','S001','TA2026',bln,'SURAT','M001','QS. Al-Fatihah','Hafal/Lancar Mandiri','Bacaan jelas.',kini],
    ['G002','S001','TA2026',bln,'DOA','M016','Doa Sebelum Makan','Menirukan','',kini],
    ['G003','S002','TA2026',bln,'IQRA','M031','Iqra Jilid 2 (Huruf Sambung & Mad)','Hafal/Lancar dengan Bantuan','Halaman terakhir: 14',kini],
    ['G004','S002','TA2026',bln,'HADITS','M037','Senyum adalah Sedekah','Hafal/Lancar Mandiri','',kini]
  ]);
  isiJikaKosong_('KAIH_Bulanan', [
    ['K001','S002','TA2026',bln,'Sudah Terbiasa','Sudah Terbiasa','Mulai Terbiasa','Sudah Terbiasa','Sudah Terbiasa','Mulai Terbiasa','Belum Terbiasa','Zahra masih sulit tidur lebih awal.','','',kini]
  ]);
  isiJikaKosong_('UlasanOrtu', [
    ['UL001','S002','TA2026',bln,'ORTU','Orang Tua Zahra (contoh)','Terima kasih, Ustazah. Kami akan latih membaca di rumah.',kini]
  ]);
}
