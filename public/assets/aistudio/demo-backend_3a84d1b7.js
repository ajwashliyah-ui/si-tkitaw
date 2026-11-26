/* Dibuat otomatis oleh tools/build.py. Jangan diedit langsung. */
/* Tiruan layanan Apps Script di memori, dipakai mode demo dan pengujian. */
function buatShim(simpanan) {
  var db = simpanan || { sheets: {}, props: {}, files: {}, n: 0 };
  var cache = {};

  function sha256(teks) {
    var data = Array.from(new TextEncoder().encode(teks));
    var K = [], H = [], p = 2, n = 0;
    while (n < 64) {
      for (var i = 2; i * i <= p && p % i; i++);
      if (i * i > p) {
        if (n < 8) H[n] = (Math.pow(p, 1 / 2) * 4294967296) >>> 0;
        K[n++] = (Math.pow(p, 1 / 3) * 4294967296) >>> 0;
      }
      p++;
    }
    var bit = data.length * 8;
    data.push(128);
    while (data.length % 64 !== 56) data.push(0);
    for (var s = 56; s >= 0; s -= 8) data.push(Math.floor(bit / Math.pow(2, s)) & 255);
    var rot = function (x, r) { return (x >>> r) | (x << (32 - r)); };
    for (var o = 0; o < data.length; o += 64) {
      var w = [], h = H.slice();
      for (var t = 0; t < 64; t++) {
        if (t < 16) w[t] = (data[o + 4 * t] << 24) | (data[o + 4 * t + 1] << 16) | (data[o + 4 * t + 2] << 8) | data[o + 4 * t + 3];
        else w[t] = (w[t - 16] + (rot(w[t - 15], 7) ^ rot(w[t - 15], 18) ^ (w[t - 15] >>> 3)) + w[t - 7] + (rot(w[t - 2], 17) ^ rot(w[t - 2], 19) ^ (w[t - 2] >>> 10))) | 0;
        var a = h[0], e = h[4];
        var t1 = (h[7] + (rot(e, 6) ^ rot(e, 11) ^ rot(e, 25)) + ((e & h[5]) ^ (~e & h[6])) + K[t] + w[t]) | 0;
        var t2 = ((rot(a, 2) ^ rot(a, 13) ^ rot(a, 22)) + ((a & h[1]) ^ (a & h[2]) ^ (h[1] & h[2]))) | 0;
        h = [(t1 + t2) | 0, a, h[1], h[2], (h[3] + t1) | 0, e, h[5], h[6]];
      }
      for (var j = 0; j < 8; j++) H[j] = (H[j] + h[j]) >>> 0;
    }
    var out = [];
    H.forEach(function (v) { out.push(v >>> 24, (v >>> 16) & 255, (v >>> 8) & 255, v & 255); });
    return out;
  }

  function sheet(nama) {
    var rows = db.sheets[nama];
    function range(r, c, nr, nc) {
      var api = {
        setValues: function (v) {
          v.forEach(function (baris, i) {
            while (rows.length < r + i) rows.push([]);
            baris.forEach(function (x, j) { rows[r - 1 + i][c - 1 + j] = String(x).replace(/^'/, ''); });
          });
          return api;
        },
        setNumberFormat: function () { return api; },
        setFontWeight: function () { return api; },
        setBackground: function () { return api; }
      };
      return api;
    }
    return {
      getRange: range,
      getLastRow: function () { return rows.length; },
      getMaxRows: function () { return 1000; },
      setFrozenRows: function () {},
      getDataRange: function () {
        return { getValues: function () { return rows.map(function (x) { return x.slice(); }); } };
      }
    };
  }

  var folder = {
    getId: function () { return 'folder-demo'; },
    createFile: function (blob) {
      var id = 'file' + (++db.n);
      db.files[id] = { data: blob.data, trashed: false };
      return berkas(id);
    }
  };
  function berkas(id) {
    return {
      getId: function () { return id; },
      setSharing: function () {},
      setTrashed: function (v) { db.files[id].trashed = v; }
    };
  }

  return {
    db: db,
    SpreadsheetApp: {
      getActiveSpreadsheet: function () {
        return {
          getSheetByName: function (n) { return db.sheets[n] ? sheet(n) : null; },
          insertSheet: function (n) { db.sheets[n] = []; return sheet(n); }
        };
      }
    },
    Utilities: {
      DigestAlgorithm: { SHA_256: 1 },
      Charset: { UTF_8: 1 },
      computeDigest: function (_, s) { return sha256(s); },
      getUuid: function () {
        return 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, function () {
          return (crypto.getRandomValues(new Uint8Array(1))[0] & 15).toString(16);
        });
      },
      formatDate: function (d, zona, pola) {
        var iso = new Date(d.getTime() + 7 * 3600000).toISOString();
        return iso.slice(0, pola.length);
      },
      base64Decode: function (s) { return s; },
      newBlob: function (data) { return { data: data }; }
    },
    PropertiesService: {
      getScriptProperties: function () {
        return {
          getProperty: function (k) { return db.props[k] || null; },
          setProperty: function (k, v) { db.props[k] = v; },
          deleteProperty: function (k) { delete db.props[k]; },
          getProperties: function () { return Object.assign({}, db.props); }
        };
      }
    },
    CacheService: {
      getScriptCache: function () {
        return {
          get: function (k) { return cache[k] || null; },
          put: function (k, v) { cache[k] = v; },
          remove: function (k) { delete cache[k]; }
        };
      }
    },
    LockService: { getScriptLock: function () { return { waitLock: function () {}, releaseLock: function () {} }; } },
    DriveApp: {
      Access: {}, Permission: {},
      getFoldersByName: function () { return { hasNext: function () { return true; }, next: function () { return folder; } }; },
      createFolder: function () { return folder; },
      getFolderById: function () { return folder; },
      getFileById: berkas
    },
    ContentService: {
      MimeType: { JSON: 'json' },
      createTextOutput: function (t) { return { setMimeType: function () { return this; }, getContent: function () { return t; } }; }
    },
    ScriptApp: {}
  };
}

function buatBackendDemo(simpanan) {
  var shim = buatShim(simpanan);
  return (function (SpreadsheetApp, Utilities, PropertiesService, CacheService, LockService, DriveApp, ContentService, ScriptApp) {
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

/** Web App API Laporan Perkembangan Anak. Skema sheet ada di Setup.gs. */

var KELAS = ['Kelas A', 'Kelas B'];
var SKALA_LIT = ['BB', 'MB', 'BSH', 'BSB'];
var STATUS_AGAMA = ['Baru Mengenalkan', 'Menirukan', 'Hafal/Lancar dengan Bantuan', 'Hafal/Lancar Mandiri'];
var SKALA_KAIH = ['Belum Terbiasa', 'Mulai Terbiasa', 'Sudah Terbiasa'];
var ASPEK_KAIH = ['bangun_pagi','beribadah','berolahraga','makan_sehat','gemar_belajar','bermasyarakat','tidur_cepat'];
var TRACK = ['TRACK_1','TRACK_2','TRACK_3','TRACK_4','KUSTOM'];
var KATEGORI = ['SURAT','DOA','IQRA','HADITS'];
var SESI_MS = 12 * 60 * 60 * 1000;

// Setiap aksi menyebut peran yang boleh memanggilnya.
var RUTE = {
  publicInfo: [null, apiPublicInfo_],
  login: [null, apiLogin_],
  me: ['ADMIN,GURU,ORTU', apiMe_],
  logout: ['ADMIN,GURU,ORTU', apiLogout_],
  changePassword: ['ADMIN,GURU,ORTU', apiChangePassword_],
  listSiswa: ['ADMIN,GURU,ORTU', apiListSiswa_],
  getReport: ['ADMIN,GURU,ORTU', apiGetReport_],
  addUlasan: ['GURU,ORTU', apiAddUlasan_],
  saveAntro: ['GURU', apiSaveAntro_],
  saveLiterasi: ['GURU', apiSaveLiterasi_],
  saveAgama: ['GURU', apiSaveAgama_],
  saveKaih: ['ORTU', apiSaveKaih_],
  adminData: ['ADMIN', apiAdminData_],
  rekap: ['ADMIN', apiRekap_],
  saveSettings: ['ADMIN', apiSaveSettings_],
  saveUser: ['ADMIN', apiSaveUser_],
  saveSiswa: ['ADMIN', apiSaveSiswa_],
  saveTA: ['ADMIN', apiSaveTA_],
  saveMateri: ['ADMIN', apiSaveMateri_],
  saveTips: ['ADMIN', apiSaveTips_],
  naikKelas: ['ADMIN', apiNaikKelas_]
};

function doGet() {
  return json_({ ok: true, data: 'API aktif' });
}

function doPost(e) {
  try {
    var req = JSON.parse(e.postData.contents);
    var rute = Object.prototype.hasOwnProperty.call(RUTE, req.action) ? RUTE[req.action] : null;
    if (!rute) throw galat_('Aksi tidak dikenal.');
    var user = null;
    if (rute[0]) {
      user = userDariToken_(req.token);
      if (!user) return json_({ ok: false, code: 'SESI', error: 'Sesi berakhir. Silakan masuk kembali.' });
      if (rute[0].indexOf(user.role) < 0) throw galat_('Anda tidak berhak melakukan aksi ini.');
    }
    var tulis = /^(save|add|change|naik|login|logout)/.test(req.action);
    var kunci = tulis ? LockService.getScriptLock() : null;
    if (kunci) kunci.waitLock(20000);
    try {
      return json_({ ok: true, data: rute[1](req.payload || {}, user, req.token) });
    } finally {
      if (kunci) kunci.releaseLock();
    }
  } catch (err) {
    if (!err.aman) console.error(err.stack || err);
    return json_({ ok: false, error: err.aman ? err.message : 'Terjadi kesalahan di server.' });
  }
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function galat_(pesan) {
  var e = new Error(pesan);
  e.aman = true;
  return e;
}

function sheet_(nama) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nama);
  if (!sh) throw galat_('Sheet ' + nama + ' belum ada. Jalankan setupDatabase().');
  return sh;
}

function teks_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Jakarta', 'yyyy-MM-dd');
  return v === null || v === undefined ? '' : String(v);
}

function baca_(nama) {
  var data = sheet_(nama).getDataRange().getValues();
  var kol = data.shift();
  return data.map(function (r, i) {
    var o = { _baris: i + 2 };
    kol.forEach(function (k, j) { o[k] = teks_(r[j]); });
    return o;
  }).filter(function (o) { return o[kol[0]] !== ''; });
}

// Apostrof di depan mencegah isian pengguna dijalankan sebagai rumus.
function amankan_(v) {
  var s = teks_(v);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function simpan_(nama, obj) {
  var sh = sheet_(nama);
  var baris = SKEMA[nama].map(function (k) { return amankan_(obj[k]); });
  var no = obj._baris || sh.getLastRow() + 1;
  var rentang = sh.getRange(no, 1, 1, baris.length);
  rentang.setNumberFormat('@');
  rentang.setValues([baris]);
  obj._baris = no;
  return obj;
}

function cari_(nama, kriteria) {
  return baca_(nama).filter(function (o) {
    return Object.keys(kriteria).every(function (k) { return o[k] === kriteria[k]; });
  });
}

function satu_(nama, kriteria) {
  return cari_(nama, kriteria)[0] || null;
}

function idBaru_(awalan) {
  return awalan + Utilities.getUuid().replace(/-/g, '').slice(0, 12);
}

function pengaturan_() {
  var o = {};
  baca_('PengaturanSekolah').forEach(function (r) { o[r.key] = r.value; });
  return o;
}

function setPengaturan_(key, value) {
  var r = satu_('PengaturanSekolah', { key: key }) || { key: key, keterangan: '' };
  r.value = value;
  simpan_('PengaturanSekolah', r);
}

function periodeKini_() {
  return Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM');
}

function geserBulan_(periode, n) {
  var p = periode.split('-');
  var t = Number(p[0]) * 12 + Number(p[1]) - 1 + n;
  return Math.floor(t / 12) + '-' + ('0' + (t % 12 + 1)).slice(-2);
}

function wajib_(v, label, maks) {
  var s = teks_(v).trim();
  if (!s) throw galat_(label + ' wajib diisi.');
  if (s.length > (maks || 200)) throw galat_(label + ' terlalu panjang.');
  return s;
}

function bebas_(v) {
  return teks_(v).trim().slice(0, 1000);
}

function pilihan_(v, daftar, label) {
  if (daftar.indexOf(v) < 0) throw galat_(label + ' tidak valid.');
  return v;
}

function tanggal_(v, label) {
  var s = wajib_(v, label, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || isNaN(Date.parse(s))) throw galat_(label + ' harus berformat YYYY-MM-DD.');
  return s;
}

function sha256_(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8)
    .map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}

function buatHash_(password) {
  var salt = Utilities.getUuid().slice(0, 8);
  return salt + '$' + sha256_(salt + password);
}

function cocok_(password, tersimpan) {
  var p = String(tersimpan).split('$');
  return p.length === 2 && sha256_(p[0] + password) === p[1];
}

function profil_(u) {
  return { user_id: u.user_id, username: u.username, role: u.role, nama_lengkap: u.nama_lengkap };
}

function userDariToken_(token) {
  if (!token) return null;
  var props = PropertiesService.getScriptProperties();
  var key = 'sesi_' + sha256_(String(token));
  var s = JSON.parse(props.getProperty(key) || 'null');
  if (!s || s.exp < Date.now()) return null;
  var u = satu_('Users', { user_id: s.uid });
  // Sidik hash membuat sesi lama gugur setelah password diganti.
  return u && u.status_aktif === 'YA' && u.password_hash.slice(-12) === s.v ? u : null;
}

function bersihkanSesi_() {
  var props = PropertiesService.getScriptProperties();
  var semua = props.getProperties();
  Object.keys(semua).forEach(function (k) {
    if (k.indexOf('sesi_') === 0 && JSON.parse(semua[k]).exp < Date.now()) props.deleteProperty(k);
  });
}

function buatSesi_(u) {
  var token = Utilities.getUuid() + Utilities.getUuid();
  PropertiesService.getScriptProperties().setProperty('sesi_' + sha256_(token),
    JSON.stringify({ uid: u.user_id, exp: Date.now() + SESI_MS, v: u.password_hash.slice(-12) }));
  return token;
}

function apiPublicInfo_() {
  var p = pengaturan_();
  var ta = satu_('TahunAjaran', { ta_id: p.tahun_ajaran_aktif });
  return {
    nama_sekolah: p.nama_sekolah, alamat_sekolah: p.alamat_sekolah, kontak_sekolah: p.kontak_sekolah,
    ta_id: p.tahun_ajaran_aktif, nama_ta: ta ? ta.nama_ta : '', periode: periodeKini_()
  };
}

function apiLogin_(d) {
  var username = wajib_(d.username, 'Username', 50).toLowerCase();
  var cache = CacheService.getScriptCache();
  var gagal = Number(cache.get('gagal_' + username) || 0);
  if (gagal >= 5) throw galat_('Terlalu banyak percobaan. Coba lagi 10 menit lagi.');
  var u = satu_('Users', { username: username });
  if (!u || u.status_aktif !== 'YA' || !cocok_(String(d.password || ''), u.password_hash)) {
    cache.put('gagal_' + username, String(gagal + 1), 600);
    throw galat_('Username atau password salah.');
  }
  cache.remove('gagal_' + username);
  bersihkanSesi_();
  return { token: buatSesi_(u), user: profil_(u) };
}

function apiMe_(d, user) {
  return profil_(user);
}

function apiLogout_(d, user, token) {
  PropertiesService.getScriptProperties().deleteProperty('sesi_' + sha256_(String(token)));
  return true;
}

function apiChangePassword_(d, user) {
  if (!cocok_(String(d.lama || ''), user.password_hash)) throw galat_('Password lama salah.');
  if (String(d.baru || '').length < 8) throw galat_('Password baru minimal 8 karakter.');
  user.password_hash = buatHash_(String(d.baru));
  simpan_('Users', user);
  return { token: buatSesi_(user) };
}

function kelasGuru_(user, p) {
  return KELAS.filter(function (k) {
    return p[k === 'Kelas A' ? 'wali_kelas_a' : 'wali_kelas_b'] === user.user_id;
  });
}

function bolehAkses_(user, siswa) {
  if (user.role === 'ADMIN') return true;
  if (user.role === 'ORTU') return siswa.ortu_user_id === user.user_id;
  return siswa.status_siswa === 'Aktif' && kelasGuru_(user, pengaturan_()).indexOf(siswa.kelas_aktif) >= 0;
}

function siswaBoleh_(user, id) {
  var s = satu_('Siswa', { siswa_id: String(id || '') });
  if (!s || !bolehAkses_(user, s)) throw galat_('Data siswa tidak tersedia untuk akun ini.');
  return s;
}

function bersih_(o) {
  var h = {};
  Object.keys(o).forEach(function (k) { if (k !== '_baris' && k !== 'password_hash') h[k] = o[k]; });
  return h;
}

function materiAktif_() {
  return cari_('Master_Materi', { aktif: 'YA' }).map(bersih_)
    .sort(function (a, b) { return Number(a.urutan) - Number(b.urutan); });
}

function apiListSiswa_(d, user) {
  return {
    siswa: baca_('Siswa').filter(function (s) { return bolehAkses_(user, s); }).map(bersih_),
    kelas: user.role === 'GURU' ? kelasGuru_(user, pengaturan_()) : [],
    materi: materiAktif_()
  };
}

function usiaBulan_(lahir, periode) {
  var l = lahir.split('-'), p = periode.split('-');
  // Usia dihitung pada akhir bulan periode.
  var akhir = new Date(Date.UTC(Number(p[0]), Number(p[1]), 0)).getUTCDate();
  var n = (p[0] - l[0]) * 12 + (p[1] - l[1]) - (akhir < Number(l[2]) ? 1 : 0);
  return Math.max(0, n);
}

// Batas penyaringan sederhana per usia (bulan), diringkas dari tabel WHO. Bukan alat diagnosis.
// Kolom: usia, BB -2SD, BB +2SD, TB -2SD, LK -2SD
var BATAS = {
  L: [[36,11.3,18.3,88.7,46.8],[48,12.7,21.2,94.9,47.5],[60,14.1,24.2,100.7,47.9],[72,15.9,27.1,106.1,48.3],[84,17.7,30.7,111.2,48.6]],
  P: [[36,10.8,18.1,87.4,45.7],[48,12.3,21.5,94.1,46.5],[60,13.7,24.9,99.9,47.0],[72,15.3,27.8,104.9,47.4],[84,16.8,31.4,109.9,47.7]]
};

function batas_(jk, usia) {
  var t = BATAS[jk] || BATAS.L;
  var u = Math.min(Math.max(usia, t[0][0]), t[t.length - 1][0]);
  var i = 0;
  while (i < t.length - 2 && u > t[i + 1][0]) i++;
  var f = (u - t[i][0]) / (t[i + 1][0] - t[i][0]);
  return t[i].map(function (v, k) { return v + (t[i + 1][k] - v) * f; });
}

function analisisAntro_(jk, usia, bb, tb, lk, lila, bbLalu) {
  var b = batas_(jk, usia), status = [], kode = [];
  if (tb < b[3]) { status.push('TB Pendek'); kode.push('ANTRO_TB_PENDEK'); }
  if (bb < b[1]) { status.push('BB Kurang'); kode.push('ANTRO_BB_KURANG'); }
  if (lila < 12.5 || lk < b[4]) { status.push('LiLA/LK Perlu Perhatian'); kode.push('ANTRO_LILA_LK_PERHATIAN'); }
  if (bb > b[2]) { status.push('BB Lebih'); kode.push('ANTRO_BB_LEBIH'); }
  if (bbLalu !== null && bb - bbLalu < 0.05) { status.push('Tren Stagnan'); kode.push('ANTRO_TREN_STAGNAN'); }
  return { status: status.join(', ') || 'Normal', kode: kode[0] || 'ANTRO_NORMAL' };
}

function urutPeriode_(a, b) {
  return a.periode_bulan < b.periode_bulan ? -1 : a.periode_bulan > b.periode_bulan ? 1 : 0;
}

function terakhir_(list, periode) {
  var l = list.filter(function (x) { return x.periode_bulan <= periode; }).sort(urutPeriode_);
  return l[l.length - 1] || null;
}

function kodeLiterasi_(l) {
  var rendah = function (v) { return v === 'BB' || v === 'MB'; };
  if (l.kelas === 'Kelas A') {
    if (rendah(l.nilai_huruf_atau_dasar)) return 'LIT_A_HURUF_LOW';
    return rendah(l.nilai_sukukata_atau_lanjutan) ? 'LIT_A_SUKUKATA_LOW' : 'LIT_A_HIGH';
  }
  if (l.track_level_dipilih === 'KUSTOM') return 'LIT_B_KUSTOM';
  var low = [l.nilai_huruf_atau_dasar, l.nilai_sukukata_atau_lanjutan, l.nilai_kalimat_opsional].some(rendah);
  return 'LIT_B_' + l.track_level_dipilih.replace('_', '') + (low ? '_LOW' : '_HIGH');
}

function kodeKaih_(k) {
  var min = null;
  ASPEK_KAIH.forEach(function (a) {
    var skor = SKALA_KAIH.indexOf(k[a]);
    if (!min || skor < min.skor) min = { a: a, skor: skor };
  });
  return min.skor === 2 ? 'KAIH_ALL_HIGH' : 'KAIH_' + min.a.toUpperCase() + '_LOW';
}

function kodeAgama_(list) {
  var urut = list.slice().sort(function (a, b) {
    return STATUS_AGAMA.indexOf(a.status_progres) - STATUS_AGAMA.indexOf(b.status_progres);
  });
  var x = urut[0];
  return 'AGAMA_' + x.kategori + (STATUS_AGAMA.indexOf(x.status_progres) < 3 ? '_LOW' : '_HIGH');
}

function tips_(antro, lit, kaih, agama) {
  var kode = [];
  if (antro) kode.push(antro.kode_pemicu_tips);
  if (lit) kode.push(kodeLiterasi_(lit));
  if (kaih) kode.push(kodeKaih_(kaih));
  if (agama.length) kode.push(kodeAgama_(agama));
  var master = cari_('Master_Tips', { aktif: 'YA' });
  return kode.map(function (k) {
    return master.filter(function (t) { return t.kondisi_pemicu === k; })[0];
  }).filter(Boolean).map(bersih_);
}

function apiGetReport_(d, user) {
  var s = siswaBoleh_(user, d.siswa_id);
  var p = pengaturan_();
  var riwayat = cari_('RiwayatKelas', { siswa_id: s.siswa_id });
  var tahun = baca_('TahunAjaran');
  // Guru hanya melihat tahun ajaran aktif dan arsip anak yang sedang diampunya.
  var taId = riwayat.some(function (r) { return r.ta_id === d.ta_id; }) ? d.ta_id
    : (riwayat[riwayat.length - 1] || { ta_id: p.tahun_ajaran_aktif }).ta_id;
  var periode = /^\d{4}-\d{2}$/.test(d.periode || '') ? d.periode : periodeKini_();
  var q = { siswa_id: s.siswa_id, ta_id: taId };
  var antro = cari_('Antropometri', q).sort(urutPeriode_).map(bersih_);
  var lit = cari_('Literasi', q).map(bersih_);
  var agama = cari_('Keagamaan', q).map(bersih_);
  var kaih = cari_('KAIH_Bulanan', q).map(bersih_);
  var periodeAgama = terakhir_(agama, periode);
  return {
    siswa: bersih_(s), ta_id: taId, periode: periode, periode_kini: periodeKini_(),
    arsip: taId !== p.tahun_ajaran_aktif || s.status_siswa !== 'Aktif',
    riwayat: riwayat.map(function (r) {
      var t = tahun.filter(function (x) { return x.ta_id === r.ta_id; })[0] || {};
      return { ta_id: r.ta_id, nama_ta: t.nama_ta || r.ta_id, tanggal_mulai: t.tanggal_mulai, tanggal_selesai: t.tanggal_selesai, kelas: r.kelas, status_akhir: r.status_akhir };
    }),
    antro: antro,
    literasi: lit.filter(function (x) { return x.periode_bulan === periode; })[0] || null,
    agama: agama.filter(function (x) { return x.periode_bulan === periode; }),
    agama_semua: agama,
    kaih: kaih.filter(function (x) { return x.periode_bulan === periode; })[0] || null,
    ulasan: cari_('UlasanOrtu', q).filter(function (x) { return x.periode_bulan === periode; }).map(bersih_),
    tips: tips_(terakhir_(antro, periode), terakhir_(lit, periode), terakhir_(kaih, periode),
      periodeAgama ? agama.filter(function (x) { return x.periode_bulan === periodeAgama.periode_bulan; }) : [])
  };
}

/** Validasi bersama untuk semua penulisan laporan: siswa aktif, tahun ajaran aktif, periode tidak di masa depan. */
function konteksTulis_(d, user) {
  var s = siswaBoleh_(user, d.siswa_id);
  if (s.status_siswa !== 'Aktif') throw galat_('Data arsip hanya bisa dibaca.');
  var ta = satu_('TahunAjaran', { ta_id: pengaturan_().tahun_ajaran_aktif });
  var periode = String(d.periode || '');
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periode) || periode > periodeKini_()) throw galat_('Periode tidak valid.');
  if (!ta || periode < ta.tanggal_mulai.slice(0, 7) || periode > ta.tanggal_selesai.slice(0, 7)) {
    throw galat_('Periode berada di luar tahun ajaran aktif.');
  }
  return { siswa: s, ta_id: ta.ta_id, periode: periode };
}

function angka_(v, min, maks, label) {
  var n = Number(String(v).replace(',', '.'));
  if (!isFinite(n) || n < min || n > maks) throw galat_(label + ' harus antara ' + min + ' dan ' + maks + '.');
  return n;
}

function apiSaveAntro_(d, user) {
  var k = konteksTulis_(d, user);
  var bb = angka_(d.bb_kg, 5, 60, 'Berat badan');
  var tb = angka_(d.tb_cm, 60, 160, 'Tinggi badan');
  var lk = angka_(d.lk_cm, 35, 65, 'Lingkar kepala');
  var lila = angka_(d.lila_cm, 8, 35, 'LiLA');
  var semua = cari_('Antropometri', { siswa_id: k.siswa.siswa_id });
  var lalu = semua.filter(function (x) { return x.periode_bulan < k.periode; }).sort(urutPeriode_).pop();
  var usia = usiaBulan_(k.siswa.tanggal_lahir, k.periode);
  var h = analisisAntro_(k.siswa.jenis_kelamin, usia, bb, tb, lk, lila, lalu ? Number(lalu.bb_kg) : null);
  var r = semua.filter(function (x) { return x.periode_bulan === k.periode && x.ta_id === k.ta_id; })[0] || { log_id: idBaru_('AN') };
  simpan_('Antropometri', Object.assign(r, {
    siswa_id: k.siswa.siswa_id, ta_id: k.ta_id, periode_bulan: k.periode, usia_bulan: usia,
    bb_kg: bb, tb_cm: tb, lk_cm: lk, lila_cm: lila, status_gizi_otomatis: h.status,
    kode_pemicu_tips: h.kode, catatan_guru: bebas_(d.catatan_guru), updated_at: new Date().toISOString()
  }));
  return h;
}

function apiSaveLiterasi_(d, user) {
  var k = konteksTulis_(d, user);
  var kelasB = k.siswa.kelas_aktif === 'Kelas B';
  var track = kelasB ? pilihan_(d.track_level_dipilih, TRACK, 'Track') : '';
  var target = track === 'KUSTOM' ? wajib_(d.target_kustom, 'Target kustom', 500) : '';
  var q = { siswa_id: k.siswa.siswa_id, ta_id: k.ta_id, periode_bulan: k.periode };
  var r = satu_('Literasi', q) || Object.assign({ lit_id: idBaru_('L') }, q);
  simpan_('Literasi', Object.assign(r, {
    kelas: k.siswa.kelas_aktif, track_level_dipilih: track, target_kustom: target,
    nilai_huruf_atau_dasar: pilihan_(d.nilai_dasar, SKALA_LIT, 'Nilai'),
    nilai_sukukata_atau_lanjutan: pilihan_(d.nilai_lanjutan, SKALA_LIT, 'Nilai'),
    nilai_kalimat_opsional: d.nilai_kalimat ? pilihan_(d.nilai_kalimat, SKALA_LIT, 'Nilai') : '',
    catatan_guru: bebas_(d.catatan_guru), updated_at: new Date().toISOString()
  }));
  if (kelasB) {
    k.siswa.target_literasi_kelas_b = track;
    simpan_('Siswa', k.siswa);
  }
  return true;
}

function apiSaveAgama_(d, user) {
  var k = konteksTulis_(d, user);
  var m = satu_('Master_Materi', { materi_id: String(d.materi_id), aktif: 'YA' });
  if (!m) throw galat_('Materi tidak ditemukan.');
  var q = { siswa_id: k.siswa.siswa_id, ta_id: k.ta_id, periode_bulan: k.periode, materi_id: m.materi_id };
  var r = satu_('Keagamaan', q) || Object.assign({ agama_id: idBaru_('G') }, q);
  simpan_('Keagamaan', Object.assign(r, {
    kategori: m.kategori, nama_materi: m.nama_materi,
    status_progres: pilihan_(d.status_progres, STATUS_AGAMA, 'Status progres'),
    catatan_guru: bebas_(d.catatan_guru), updated_at: new Date().toISOString()
  }));
  return true;
}

function simpanFoto_(base64, siswaId, periode) {
  var m = /^data:image\/jpeg;base64,([A-Za-z0-9+\/=]+)$/.exec(String(base64));
  if (!m || m[1].length > 2000000) throw galat_('Foto harus JPEG dan berukuran di bawah 1,5 MB.');
  var folderId = pengaturan_().folder_drive_id;
  var folder = folderId ? DriveApp.getFolderById(folderId) : folderFoto_();
  var blob = Utilities.newBlob(Utilities.base64Decode(m[1]), 'image/jpeg', siswaId + '_' + periode + '.jpg');
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getId();
}

function apiSaveKaih_(d, user) {
  var k = konteksTulis_(d, user);
  if (k.periode !== periodeKini_()) throw galat_('7 KAIH hanya bisa diisi untuk bulan berjalan.');
  var q = { siswa_id: k.siswa.siswa_id, ta_id: k.ta_id, periode_bulan: k.periode };
  var r = satu_('KAIH_Bulanan', q) || Object.assign({ kaih_id: idBaru_('K'), foto_drive_id: '', foto_url: '' }, q);
  ASPEK_KAIH.forEach(function (a) { r[a] = pilihan_(d[a], SKALA_KAIH, 'Isian ' + a.replace('_', ' ')); });
  r.catatan_ortu = bebas_(d.catatan_ortu);
  r.updated_at = new Date().toISOString();
  var lama = '';
  if (d.foto_base64) {
    lama = r.foto_drive_id;
    r.foto_drive_id = simpanFoto_(d.foto_base64, k.siswa.siswa_id, k.periode);
    r.foto_url = 'https://drive.google.com/thumbnail?id=' + r.foto_drive_id + '&sz=w1000';
  }
  simpan_('KAIH_Bulanan', r);
  // File lama dibuang setelah baris baru tersimpan agar foto tidak hilang bila penyimpanan gagal.
  if (lama) {
    try { DriveApp.getFileById(lama).setTrashed(true); } catch (e) { console.warn(e); }
  }
  return true;
}

function apiAddUlasan_(d, user) {
  var s = siswaBoleh_(user, d.siswa_id);
  var ta = pengaturan_().tahun_ajaran_aktif;
  if (s.status_siswa !== 'Aktif' || d.ta_id !== ta) throw galat_('Diskusi pada arsip hanya bisa dibaca.');
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(d.periode || '')) throw galat_('Periode tidak valid.');
  simpan_('UlasanOrtu', {
    ulasan_id: idBaru_('UL'), siswa_id: s.siswa_id, ta_id: ta, periode_bulan: d.periode,
    pengirim_role: user.role, pengirim_nama: user.nama_lengkap,
    isi_pesan: wajib_(d.isi_pesan, 'Pesan', 1000), created_at: new Date().toISOString()
  });
  return true;
}

function apiAdminData_() {
  var urut = function (n) { return baca_(n).map(bersih_); };
  return {
    pengaturan: pengaturan_(), users: urut('Users'), siswa: urut('Siswa'),
    tahun: urut('TahunAjaran'), materi: urut('Master_Materi'), tips: urut('Master_Tips')
  };
}

function apiRekap_(d) {
  var periode = /^\d{4}-\d{2}$/.test(d.periode || '') ? d.periode : periodeKini_();
  var ada = function (nama) {
    var o = {};
    cari_(nama, { periode_bulan: periode }).forEach(function (x) { o[x.siswa_id] = true; });
    return o;
  };
  var a = ada('Antropometri'), l = ada('Literasi'), g = ada('Keagamaan'), k = ada('KAIH_Bulanan');
  return {
    periode: periode,
    baris: cari_('Siswa', { status_siswa: 'Aktif' }).map(function (s) {
      return { nama_anak: s.nama_anak, kelas: s.kelas_aktif, antro: !!a[s.siswa_id], literasi: !!l[s.siswa_id], agama: !!g[s.siswa_id], kaih: !!k[s.siswa_id] };
    })
  };
}

function apiSaveSettings_(d) {
  var nilai = {
    nama_sekolah: wajib_(d.nama_sekolah, 'Nama sekolah'),
    alamat_sekolah: bebas_(d.alamat_sekolah),
    kontak_sekolah: bebas_(d.kontak_sekolah),
    folder_drive_id: bebas_(d.folder_drive_id)
  };
  ['wali_kelas_a', 'wali_kelas_b'].forEach(function (k) {
    if (d[k] && !satu_('Users', { user_id: d[k], role: 'GURU' })) throw galat_('Wali kelas harus akun Guru.');
    nilai[k] = d[k] || '';
  });
  Object.keys(nilai).forEach(function (k) { setPengaturan_(k, nilai[k]); });
  var ta = pengaturan_().tahun_ajaran_aktif;
  cari_('RiwayatKelas', { ta_id: ta }).forEach(function (r) {
    r.wali_kelas_id = nilai[r.kelas === 'Kelas A' ? 'wali_kelas_a' : 'wali_kelas_b'];
    simpan_('RiwayatKelas', r);
  });
  return true;
}

function apiSaveUser_(d, admin) {
  var username = wajib_(d.username, 'Username', 50).toLowerCase();
  var u = d.user_id ? satu_('Users', { user_id: d.user_id }) : null;
  var sama = satu_('Users', { username: username });
  if (sama && (!u || sama.user_id !== u.user_id)) throw galat_('Username sudah dipakai.');
  if (!u) u = { user_id: idBaru_('U'), password_hash: '' };
  if (d.password) {
    if (String(d.password).length < 8) throw galat_('Password minimal 8 karakter.');
    u.password_hash = buatHash_(String(d.password));
  }
  if (!u.password_hash) throw galat_('Password wajib diisi untuk akun baru.');
  var role = pilihan_(d.role, ['ADMIN', 'GURU', 'ORTU'], 'Peran');
  var aktif = pilihan_(d.status_aktif, ['YA', 'TIDAK'], 'Status');
  if (u.user_id === admin.user_id && (role !== 'ADMIN' || aktif !== 'YA')) throw galat_('Anda tidak bisa menonaktifkan akun sendiri.');
  simpan_('Users', Object.assign(u, {
    username: username, role: role, status_aktif: aktif,
    nama_lengkap: wajib_(d.nama_lengkap, 'Nama lengkap'), no_hp: bebas_(d.no_hp)
  }));
  return true;
}

function apiSaveSiswa_(d) {
  var s = d.siswa_id ? satu_('Siswa', { siswa_id: d.siswa_id }) : null;
  var baru = !s;
  var p = pengaturan_();
  if (d.ortu_user_id && !satu_('Users', { user_id: d.ortu_user_id, role: 'ORTU' })) throw galat_('Akun orang tua tidak ditemukan.');
  if (baru) s = { siswa_id: idBaru_('S'), target_literasi_kelas_b: '' };
  var kelas = pilihan_(d.kelas_aktif, KELAS.concat('Lulus'), 'Kelas');
  Object.assign(s, {
    nis: wajib_(d.nis, 'NIS', 30), nama_anak: wajib_(d.nama_anak, 'Nama anak'),
    jenis_kelamin: pilihan_(d.jenis_kelamin, ['L', 'P'], 'Jenis kelamin'),
    tanggal_lahir: tanggal_(d.tanggal_lahir, 'Tanggal lahir'),
    ortu_user_id: d.ortu_user_id || '', kelas_aktif: kelas,
    status_siswa: kelas === 'Lulus' ? 'Lulus' : 'Aktif'
  });
  simpan_('Siswa', s);
  var r = satu_('RiwayatKelas', { siswa_id: s.siswa_id, ta_id: p.tahun_ajaran_aktif });
  if (kelas !== 'Lulus') {
    r = r || { riwayat_id: idBaru_('R'), siswa_id: s.siswa_id, ta_id: p.tahun_ajaran_aktif, status_akhir: 'Berjalan' };
    r.kelas = kelas;
    r.wali_kelas_id = p[kelas === 'Kelas A' ? 'wali_kelas_a' : 'wali_kelas_b'] || '';
    simpan_('RiwayatKelas', r);
  }
  return true;
}

function apiSaveTA_(d) {
  var t = d.ta_id ? satu_('TahunAjaran', { ta_id: d.ta_id }) : null;
  var mulai = tanggal_(d.tanggal_mulai, 'Tanggal mulai');
  var selesai = tanggal_(d.tanggal_selesai, 'Tanggal selesai');
  if (selesai <= mulai) throw galat_('Tanggal selesai harus setelah tanggal mulai.');
  t = t || { ta_id: idBaru_('TA'), status_aktif: 'TIDAK' };
  Object.assign(t, { nama_ta: wajib_(d.nama_ta, 'Nama tahun ajaran', 20), tanggal_mulai: mulai, tanggal_selesai: selesai });
  simpan_('TahunAjaran', t);
  return true;
}

function apiSaveMateri_(d) {
  var m = d.materi_id ? satu_('Master_Materi', { materi_id: d.materi_id }) : null;
  m = m || { materi_id: idBaru_('M') };
  simpan_('Master_Materi', Object.assign(m, {
    kategori: pilihan_(d.kategori, KATEGORI, 'Kategori'), nama_materi: wajib_(d.nama_materi, 'Nama materi'),
    urutan: angka_(d.urutan, 1, 999, 'Urutan'), aktif: pilihan_(d.aktif, ['YA', 'TIDAK'], 'Status')
  }));
  return true;
}

function apiSaveTips_(d) {
  var t = satu_('Master_Tips', { tips_id: String(d.tips_id) });
  if (!t) throw galat_('Tips tidak ditemukan.');
  simpan_('Master_Tips', Object.assign(t, {
    judul_tips: wajib_(d.judul_tips, 'Judul'), isi_tips_ayah_bunda: wajib_(d.isi_tips_ayah_bunda, 'Isi', 1000),
    aktif: pilihan_(d.aktif, ['YA', 'TIDAK'], 'Status')
  }));
  return true;
}

function apiNaikKelas_(d) {
  if (d.konfirmasi !== 'NAIK KELAS') throw galat_('Ketik NAIK KELAS untuk mengonfirmasi.');
  // ta_asal mencegah klik ganda atau tab lama menaikkan kelas dua kali.
  if (d.ta_asal !== pengaturan_().tahun_ajaran_aktif) throw galat_('Tahun ajaran sudah berubah. Muat ulang halaman.');
  return jalankanKenaikan_();
}

function jalankanKenaikan_() {
  var p = pengaturan_();
  var lama = satu_('TahunAjaran', { ta_id: p.tahun_ajaran_aktif });
  if (!lama) throw galat_('Tahun ajaran aktif tidak ditemukan.');
  var tahun = Number(lama.tanggal_mulai.slice(0, 4)) + 1;
  var nama = tahun + '/' + (tahun + 1);
  var baru = satu_('TahunAjaran', { nama_ta: nama }) || {
    ta_id: 'TA' + tahun, nama_ta: nama, tanggal_mulai: tahun + '-07-13', tanggal_selesai: (tahun + 1) + '-06-26'
  };
  var hasil = { naik: 0, lulus: 0, tahun_baru: nama };
  var riwayat = baca_('RiwayatKelas');
  cari_('Siswa', { status_siswa: 'Aktif' }).forEach(function (s) {
    var r = riwayat.filter(function (x) { return x.siswa_id === s.siswa_id && x.ta_id === lama.ta_id; })[0];
    // Siswa tanpa riwayat di tahun lama (misalnya pendaftar baru) tidak ikut dinaikkan.
    if (!r) return;
    // Keputusan memakai kelas pada riwayat lama, sehingga proses yang terputus aman diulang.
    var keB = r.kelas === 'Kelas A';
    if (keB) {
      s.kelas_aktif = 'Kelas B';
      s.target_literasi_kelas_b = 'TRACK_1';
      if (!satu_('RiwayatKelas', { siswa_id: s.siswa_id, ta_id: baru.ta_id })) {
        simpan_('RiwayatKelas', { riwayat_id: idBaru_('R'), siswa_id: s.siswa_id, ta_id: baru.ta_id, kelas: 'Kelas B', wali_kelas_id: p.wali_kelas_b, status_akhir: 'Berjalan' });
      }
      hasil.naik++;
    } else {
      s.kelas_aktif = 'Lulus';
      s.status_siswa = 'Lulus';
      hasil.lulus++;
    }
    simpan_('Siswa', s);
    r.status_akhir = keB ? 'Naik Kelas' : 'Lulus';
    simpan_('RiwayatKelas', r);
  });
  lama.status_aktif = 'TIDAK';
  simpan_('TahunAjaran', lama);
  baru.status_aktif = 'YA';
  simpan_('TahunAjaran', baru);
  setPengaturan_('tahun_ajaran_aktif', baru.ta_id);
  return hasil;
}

/** Dipasang sebagai trigger harian. Hanya bekerja setelah tahun ajaran aktif berakhir. */
function prosesKenaikanKelasOtomatis() {
  var kunci = LockService.getScriptLock();
  kunci.waitLock(30000);
  try {
    var ta = satu_('TahunAjaran', { ta_id: pengaturan_().tahun_ajaran_aktif });
    var hariIni = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd');
    if (!ta || hariIni <= ta.tanggal_selesai) return 'Belum waktunya';
    return jalankanKenaikan_();
  } finally {
    kunci.releaseLock();
  }
}

function pasangTriggerKenaikan() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'prosesKenaikanKelasOtomatis') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('prosesKenaikanKelasOtomatis').timeBased().everyDays(1).atHour(1).create();
}

  if (!shim.db.sheets.Users) setupDatabase();
  return { db: shim.db, doPost: doPost };
  })(shim.SpreadsheetApp, shim.Utilities, shim.PropertiesService, shim.CacheService, shim.LockService, shim.DriveApp, shim.ContentService, shim.ScriptApp);
}
