import { SchoolDatabase } from '../types';

export function generateConfigJs(gasUrl: string): string {
  return `// Konfigurasi Terpusat GitHub Pages -> Google Apps Script Web App
window.APP_CONFIG = {
  GAS_WEBAPP_URL: "${gasUrl || 'https://script.google.com/macros/s/GANTI_DENGAN_DEPLOYMENT_ID_ANDA/exec'}",
  SCHOOL_NAME: "TK IT AL-WASHLIYAH",
  MAX_HASIL_KARYA_PER_BULAN: 3
};
`;
}

export function generateSetupGs(db: SchoolDatabase): string {
  const masterMateriJson = JSON.stringify(db.masterMateri);
  const masterTipsJson = JSON.stringify(db.masterTips);
  const bankMateriJson = JSON.stringify(db.bankMateriHarian);
  const masterAtpJson = JSON.stringify(db.masterAtp);
  const masterKelasJson = JSON.stringify(
    db.masterKelas && db.masterKelas.length > 0
      ? db.masterKelas
      : [
          { kelas_id: 'KLS-A', nama_kelas: 'Kelas A', jenjang: 'A', urutan: 1, aktif: true },
          { kelas_id: 'KLS-B', nama_kelas: 'Kelas B', jenjang: 'B', urutan: 2, aktif: true },
        ]
  );
  const usersJson = JSON.stringify(db.users);
  const taJson = JSON.stringify(db.tahunAjaran);
  const siswaJson = JSON.stringify(db.siswa);
  const riwayatJson = JSON.stringify(db.riwayatKelas);
  const syncKey = db.pengaturanSekolah.gas_sync_key || 'WASHLIYAH_SYNC_2026';

  return `/**
 * Setup.gs — TK IT AL-WASHLIYAH (NPSN: ${db.pengaturanSekolah.npsn})
 * Jalankan fungsi setupDatabase() satu kali pada Google Apps Script Editor.
 */

function getOrCreateFolder_(folderName, parentFolder) {
  var iterator = parentFolder
    ? parentFolder.getFoldersByName(folderName)
    : DriveApp.getFoldersByName(folderName);
  if (iterator.hasNext()) return iterator.next();
  return parentFolder ? parentFolder.createFolder(folderName) : DriveApp.createFolder(folderName);
}

function ensureSheetWithHeaders_(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  var isNew = false;
  if (!sheet) {
    sheet = ss.insertSheet(name);
    isNew = true;
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#dcebd2');
    sheet.setFrozenRows(1);
    isNew = true;
  }
  return { sheet: sheet, isNew: isNew };
}

function setupDatabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var rootFolder = getOrCreateFolder_('TK_IT_AL_WASHLIYAH_STORAGE', null);
  var kaihFolder = getOrCreateFolder_('Foto_KAIH_TK_IT_AL_WASHLIYAH', rootFolder);
  var karyaFolder = getOrCreateFolder_('Foto_Hasil_Karya_TK_IT_AL_WASHLIYAH', rootFolder);

  PropertiesService.getScriptProperties().setProperty('SYNC_KEY', '${syncKey}');

  var pengaturan = ensureSheetWithHeaders_(ss, 'PengaturanSekolah', ['key', 'value', 'keterangan']);
  if (pengaturan.isNew) {
    pengaturan.sheet.getRange(2, 1, 9, 3).setValues([
      ['nama_sekolah', '${db.pengaturanSekolah.nama_sekolah}', 'Nama resmi lembaga PAUD'],
      ['npsn', '${db.pengaturanSekolah.npsn}', 'Nomor Pokok Sekolah Nasional'],
      ['alamat_sekolah', '${db.pengaturanSekolah.alamat_sekolah}', 'Alamat lengkap sekolah'],
      ['kontak_sekolah', '${db.pengaturanSekolah.kontak_sekolah}', 'Email & telepon resmi'],
      ['kepala_sekolah', '${db.pengaturanSekolah.kepala_sekolah}', 'Nama Kepala Sekolah'],
      ['tahun_ajaran_aktif', '${db.pengaturanSekolah.tahun_ajaran_aktif}', 'Tahun ajaran berjalan'],
      ['semester_aktif', '${db.pengaturanSekolah.semester_aktif}', 'Semester berjalan'],
      ['folder_drive_id', kaihFolder.getId(), 'ID folder Google Drive foto KAIH'],
      ['folder_karya_drive_id', karyaFolder.getId(), 'ID folder Google Drive foto Hasil Karya']
    ]);
  }

  var sUsers = ensureSheetWithHeaders_(ss, 'Users', ['user_id', 'username', 'password_hash', 'role', 'nama_lengkap', 'no_hp', 'kelas_ampu', 'status_aktif']);
  if (sUsers.isNew) {
    var usersData = ${usersJson}.map(function(u) {
      return [u.user_id, u.username, u.password_hash, u.role, u.nama_lengkap, u.no_hp, u.kelas_ampu || '', u.status_aktif];
    });
    if (usersData.length) sUsers.sheet.getRange(2, 1, usersData.length, 8).setValues(usersData);
  }

  var sTA = ensureSheetWithHeaders_(ss, 'TahunAjaran', ['ta_id', 'nama_ta', 'tanggal_mulai', 'tanggal_selesai', 'status_aktif']);
  if (sTA.isNew) {
    var taData = ${taJson}.map(function(t) { return [t.ta_id, t.nama_ta, t.tanggal_mulai, t.tanggal_selesai, t.status_aktif]; });
    if (taData.length) sTA.sheet.getRange(2, 1, taData.length, 5).setValues(taData);
  }

  var sSiswa = ensureSheetWithHeaders_(ss, 'Siswa', ['siswa_id', 'nis', 'nama_anak', 'jenis_kelamin', 'tanggal_lahir', 'ortu_user_id', 'kelas_aktif', 'status_siswa', 'target_literasi_kelas_b', 'target_kustom_kelas_b', 'keputusan_kenaikan', 'catatan_kenaikan', 'keputusan_diatur_oleh']);
  if (sSiswa.isNew) {
    var siswaData = ${siswaJson}.map(function(s) {
      return [s.siswa_id, s.nis, s.nama_anak, s.jenis_kelamin, s.tanggal_lahir, s.ortu_user_id, s.kelas_aktif, s.status_siswa, s.target_literasi_kelas_b, s.target_kustom_kelas_b || '', s.keputusan_kenaikan || 'BELUM_DITENTUKAN', s.catatan_kenaikan || '', s.keputusan_diatur_oleh || ''];
    });
    if (siswaData.length) sSiswa.sheet.getRange(2, 1, siswaData.length, 13).setValues(siswaData);
  }

  var sRiwayat = ensureSheetWithHeaders_(ss, 'RiwayatKelas', ['riwayat_id', 'siswa_id', 'ta_id', 'nama_ta', 'kelas', 'wali_kelas_id', 'status_akhir', 'catatan']);
  if (sRiwayat.isNew) {
    var rwyData = ${riwayatJson}.map(function(r) { return [r.riwayat_id, r.siswa_id, r.ta_id, r.nama_ta || '', r.kelas, r.wali_kelas_id, r.status_akhir, r.catatan || '']; });
    if (rwyData.length) sRiwayat.sheet.getRange(2, 1, rwyData.length, 8).setValues(rwyData);
  }

  ensureSheetWithHeaders_(ss, 'Antropometri', ['log_id', 'siswa_id', 'ta_id', 'periode_bulan', 'usia_bulan', 'bb_kg', 'tb_cm', 'lk_cm', 'lila_cm', 'status_gizi_otomatis', 'kode_pemicu_tips', 'catatan_guru', 'updated_at']);
  ensureSheetWithHeaders_(ss, 'Literasi', ['lit_id', 'siswa_id', 'ta_id', 'periode_bulan', 'kelas', 'track_level_dipilih', 'target_kustom', 'nilai_huruf_atau_dasar', 'nilai_sukukata_atau_lanjutan', 'nilai_kalimat_opsional', 'catatan_guru', 'updated_at']);
  ensureSheetWithHeaders_(ss, 'Keagamaan', ['agama_id', 'siswa_id', 'ta_id', 'periode_bulan', 'kategori', 'materi_id', 'nama_materi', 'status_progres', 'catatan_guru', 'updated_at']);
  ensureSheetWithHeaders_(ss, 'KAIH_Harian', ['kaih_harian_id', 'siswa_id', 'ta_id', 'tanggal', 'periode_bulan', 'bangun_pagi', 'beribadah', 'berolahraga', 'makan_sehat', 'gemar_belajar', 'bermasyarakat', 'tidur_cepat', 'catatan_ortu', 'updated_at']);
  ensureSheetWithHeaders_(ss, 'KAIH_Foto_Bulanan', ['foto_id', 'siswa_id', 'ta_id', 'periode_bulan', 'aspek_kaih', 'foto_drive_id', 'foto_url', 'keterangan', 'updated_at']);
  ensureSheetWithHeaders_(ss, 'UlasanOrtu', ['ulasan_id', 'siswa_id', 'ta_id', 'periode_bulan', 'pengirim_role', 'pengirim_nama', 'isi_pesan', 'created_at']);

  var sMateri = ensureSheetWithHeaders_(ss, 'Master_Materi', ['materi_id', 'kategori', 'nama_materi', 'urutan', 'aktif']);
  if (sMateri.isNew) {
    var mRows = ${masterMateriJson}.map(function(m) { return [m.materi_id, m.kategori, m.nama_materi, m.urutan, m.aktif]; });
    if (mRows.length) sMateri.sheet.getRange(2, 1, mRows.length, 5).setValues(mRows);
  }

  var sTips = ensureSheetWithHeaders_(ss, 'Master_Tips', ['tips_id', 'kategori_pemicu', 'kondisi_pemicu', 'judul_tips', 'isi_tips_ayah_bunda', 'aktif']);
  if (sTips.isNew) {
    var tRows = ${masterTipsJson}.map(function(t) { return [t.tips_id, t.kategori_pemicu, t.kondisi_pemicu, t.judul_tips, t.isi_tips_ayah_bunda, t.aktif]; });
    if (tRows.length) sTips.sheet.getRange(2, 1, tRows.length, 6).setValues(tRows);
  }

  var sBank = ensureSheetWithHeaders_(ss, 'Bank_Materi_Harian', ['kode_item', 'bidang', 'level_track', 'kategori', 'label_kelompok', 'isi_item', 'pertanyaan_cek', 'aktif']);
  if (sBank.isNew) {
    var bRows = ${bankMateriJson}.map(function(b) { return [b.kode_item, b.bidang, b.level_track, b.kategori, b.label_kelompok, b.isi_item, b.pertanyaan_cek || '', b.aktif]; });
    if (bRows.length) sBank.sheet.getRange(2, 1, bRows.length, 8).setValues(bRows);
  }

  ensureSheetWithHeaders_(ss, 'Log_Materi_Harian', ['id_log', 'tanggal', 'id_siswa', 'nama_siswa', 'kelas', 'bidang', 'kategori', 'kode_item', 'item_dipilih', 'halaman_iqra', 'status_penguasaan', 'catatan_guru', 'nama_guru', 'timestamp']);
  ensureSheetWithHeaders_(ss, 'DaftarHadir', ['absen_id', 'tanggal', 'periode_bulan', 'semester', 'ta_id', 'siswa_id', 'nama_anak', 'kelas', 'status', 'diinput_oleh', 'updated_at']);
  ensureSheetWithHeaders_(ss, 'Asesmen_Anekdot', ['anekdot_id', 'tanggal', 'periode_bulan', 'semester', 'ta_id', 'siswa_id', 'nama_anak', 'kelas', 'deskripsi_kejadian', 'analisis_nabp', 'analisis_jd', 'analisis_lmstrs', 'umpan_balik', 'guru_nama', 'updated_at']);
  ensureSheetWithHeaders_(ss, 'Asesmen_HasilKarya', ['karya_id', 'tanggal', 'periode_bulan', 'semester', 'ta_id', 'siswa_id', 'nama_anak', 'kelas', 'foto_drive_id', 'foto_url', 'deskripsi_karya', 'analisis_nabp', 'analisis_jd', 'analisis_lmstrs', 'guru_nama', 'updated_at']);
  ensureSheetWithHeaders_(ss, 'Asesmen_Ceklis', ['ceklis_id', 'tanggal', 'periode_bulan', 'semester', 'ta_id', 'siswa_id', 'nama_anak', 'kelas', 'elemen', 'kode_atp', 'tujuan_pembelajaran', 'konteks', 'status_muncul', 'kejadian_teramati', 'guru_nama', 'updated_at']);

  var sAtp = ensureSheetWithHeaders_(ss, 'Master_ATP', ['atp_uid', 'kelompok', 'semester_target', 'elemen', 'kode_atp', 'tujuan_pembelajaran', 'aktif']);
  if (sAtp.isNew) {
    var aRows = ${masterAtpJson}.map(function(a) { return [a.atp_uid, a.kelompok, a.semester_target, a.elemen, a.kode_atp, a.tujuan_pembelajaran, a.aktif]; });
    if (aRows.length) sAtp.sheet.getRange(2, 1, aRows.length, 7).setValues(aRows);
  }

  var sKelas = ensureSheetWithHeaders_(ss, 'Master_Kelas', ['kelas_id', 'nama_kelas', 'jenjang', 'urutan', 'aktif']);
  if (sKelas.isNew) {
    var kRows = ${masterKelasJson}.map(function(k) { return [k.kelas_id, k.nama_kelas, k.jenjang, k.urutan, k.aktif]; });
    if (kRows.length) sKelas.sheet.getRange(2, 1, kRows.length, 5).setValues(kRows);
  }

  return 'Setup database TK IT AL-WASHLIYAH selesai! Sync Key: ' + '${syncKey}';
}
`;
}

export function generateCodeGs(): string {
  return `/**
 * Code.gs — Web App API Backend & Sinkronisasi Google Sheets TK IT AL-WASHLIYAH
 * Mendukung koneksi langsung dari aplikasi web (via Sync Key) maupun GitHub Pages.
 */

function doGet() {
  return jsonOut_({
    ok: true,
    service: 'TK IT AL-WASHLIYAH Google Sheets Bridge',
    school: getPengaturanMap_().nama_sekolah || 'TK IT AL-WASHLIYAH'
  });
}

function doPost(e) {
  var action = '';
  try {
    var rawBody = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    var body = JSON.parse(rawBody);
    action = body.action || '';
    var token = body.token || '';
    var syncKey = body.syncKey || '';
    var payload = body.payload || {};

    if (action === 'login') return jsonOut_(handleLogin_(payload));
    if (action === 'getSchoolInfo') return jsonOut_({ ok: true, data: getPengaturanMap_() });

    var validSyncKey = verifySyncKey_(syncKey);
    if (action === 'ping') {
      if (!validSyncKey) return jsonOut_({ ok: false, error: 'Sync Key tidak sesuai.' });
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      return jsonOut_({
        ok: true,
        school: getPengaturanMap_().nama_sekolah || ss.getName(),
        sheets: ss.getSheets().length,
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'syncFullDb') {
      if (!validSyncKey) return jsonOut_({ ok: false, error: 'Sync Key tidak sesuai.' });
      return jsonOut_({ ok: true, data: syncFullDatabase_(payload) });
    }

    if (action === 'pullFullDb') {
      if (!validSyncKey) return jsonOut_({ ok: false, error: 'Sync Key tidak sesuai.' });
      return jsonOut_({ ok: true, data: pullFullDatabase_() });
    }

    var session = verifyToken_(token);
    if (!session) return jsonOut_({ ok: false, error: 'Sesi tidak valid atau kadaluarsa.' });

    switch (action) {
      case 'getAllData':
        return jsonOut_({ ok: true, data: exportAllSheetsJson_() });
      case 'saveDaftarHadir':
        return jsonOut_({ ok: true, data: saveDaftarHadir_(payload, session) });
      case 'saveHasilKarya':
        return jsonOut_({ ok: true, data: saveHasilKarya_(payload, session) });
      case 'saveKaihFotoAspek':
        return jsonOut_({ ok: true, data: saveKaihFotoAspek_(payload, session) });
      case 'getRaporBulanan':
        return jsonOut_({ ok: true, data: getRaporBulanan(payload.id_siswa, payload.bulan, payload.tahun) });
      case 'getRaporSatuKelas':
        return jsonOut_({ ok: true, data: getRaporSatuKelas(payload.kelas, payload.bulan, payload.tahun) });
      case 'prosesKenaikanKelasOtomatis':
        if (session.role !== 'Admin') return jsonOut_({ ok: false, error: 'Hanya Admin.' });
        return jsonOut_({ ok: true, data: prosesKenaikanKelasOtomatis() });
      default:
        return jsonOut_({ ok: false, action: action, error: 'Action tidak dikenal: ' + action });
    }
  } catch (err) {
    return jsonOut_({ ok: false, action: action, error: String(err.message || err) });
  }
}

function verifySyncKey_(incoming) {
  var saved = PropertiesService.getScriptProperties().getProperty('SYNC_KEY') || 'WASHLIYAH_SYNC_2026';
  return String(incoming || '') === String(saved);
}

function replaceSheetRows_(ss, name, headers, rows) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  sheet.clearContents();
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#dcebd2');
  sheet.setFrozenRows(1);
  if (rows && rows.length) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

function syncFullDatabase_(db) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var cfg = db.pengaturanSekolah || {};
  replaceSheetRows_(ss, 'PengaturanSekolah', ['key', 'value', 'keterangan'], [
    ['nama_sekolah', cfg.nama_sekolah || '', 'Nama resmi lembaga PAUD'],
    ['npsn', cfg.npsn || '', 'Nomor Pokok Sekolah Nasional'],
    ['alamat_sekolah', cfg.alamat_sekolah || '', 'Alamat lengkap sekolah'],
    ['kontak_sekolah', cfg.kontak_sekolah || '', 'Email & telepon resmi'],
    ['kepala_sekolah', cfg.kepala_sekolah || '', 'Nama Kepala Sekolah'],
    ['tahun_ajaran_aktif', cfg.tahun_ajaran_aktif || '', 'Tahun ajaran berjalan'],
    ['semester_aktif', cfg.semester_aktif || 'Semester 1', 'Semester berjalan'],
    ['folder_drive_id', cfg.folder_drive_id || '', 'ID folder Google Drive']
  ]);

  replaceSheetRows_(ss, 'Users',
    ['user_id', 'username', 'password_hash', 'role', 'nama_lengkap', 'no_hp', 'kelas_ampu', 'status_aktif'],
    (db.users || []).map(function(u) {
      return [u.user_id, u.username, u.password_hash || '', u.role, u.nama_lengkap, u.no_hp || '', u.kelas_ampu || '', !!u.status_aktif];
    })
  );

  replaceSheetRows_(ss, 'TahunAjaran',
    ['ta_id', 'nama_ta', 'tanggal_mulai', 'tanggal_selesai', 'status_aktif'],
    (db.tahunAjaran || []).map(function(t) {
      return [t.ta_id, t.nama_ta, t.tanggal_mulai, t.tanggal_selesai, !!t.status_aktif];
    })
  );

  replaceSheetRows_(ss, 'Siswa',
    ['siswa_id', 'nis', 'nama_anak', 'jenis_kelamin', 'tanggal_lahir', 'ortu_user_id', 'kelas_aktif', 'status_siswa', 'target_literasi_kelas_b', 'target_kustom_kelas_b', 'keputusan_kenaikan', 'catatan_kenaikan', 'keputusan_diatur_oleh'],
    (db.siswa || []).map(function(s) {
      return [s.siswa_id, s.nis, s.nama_anak, s.jenis_kelamin, s.tanggal_lahir, s.ortu_user_id || '', s.kelas_aktif, s.status_siswa, s.target_literasi_kelas_b, s.target_kustom_kelas_b || '', s.keputusan_kenaikan || 'BELUM_DITENTUKAN', s.catatan_kenaikan || '', s.keputusan_diatur_oleh || ''];
    })
  );

  replaceSheetRows_(ss, 'RiwayatKelas',
    ['riwayat_id', 'siswa_id', 'ta_id', 'nama_ta', 'kelas', 'wali_kelas_id', 'status_akhir', 'catatan'],
    (db.riwayatKelas || []).map(function(r) {
      return [r.riwayat_id, r.siswa_id, r.ta_id, r.nama_ta || '', r.kelas, r.wali_kelas_id || '', r.status_akhir, r.catatan || ''];
    })
  );

  replaceSheetRows_(ss, 'Antropometri',
    ['log_id', 'siswa_id', 'ta_id', 'periode_bulan', 'usia_bulan', 'bb_kg', 'tb_cm', 'lk_cm', 'lila_cm', 'status_gizi_otomatis', 'kode_pemicu_tips', 'catatan_guru', 'updated_at'],
    (db.antropometri || []).map(function(a) {
      return [a.log_id, a.siswa_id, a.ta_id, a.periode_bulan, a.usia_bulan, a.bb_kg, a.tb_cm, a.lk_cm, a.lila_cm, a.status_gizi_otomatis, a.kode_pemicu_tips, a.catatan_guru || '', a.updated_at];
    })
  );

  replaceSheetRows_(ss, 'Literasi',
    ['lit_id', 'siswa_id', 'ta_id', 'periode_bulan', 'kelas', 'track_level_dipilih', 'target_kustom', 'nilai_huruf_atau_dasar', 'nilai_sukukata_atau_lanjutan', 'nilai_kalimat_opsional', 'catatan_guru', 'updated_at'],
    (db.literasi || []).map(function(l) {
      return [l.lit_id, l.siswa_id, l.ta_id, l.periode_bulan, l.kelas, l.track_level_dipilih, l.target_kustom || '', l.nilai_huruf_atau_dasar, l.nilai_sukukata_atau_lanjutan, l.nilai_kalimat_opsional || '', l.catatan_guru || '', l.updated_at];
    })
  );

  replaceSheetRows_(ss, 'Keagamaan',
    ['agama_id', 'siswa_id', 'ta_id', 'periode_bulan', 'kategori', 'materi_id', 'nama_materi', 'status_progres', 'catatan_guru', 'updated_at'],
    (db.keagamaan || []).map(function(k) {
      return [k.agama_id, k.siswa_id, k.ta_id, k.periode_bulan, k.kategori, k.materi_id, k.nama_materi, k.status_progres, k.catatan_guru || '', k.updated_at];
    })
  );

  replaceSheetRows_(ss, 'KAIH_Harian',
    ['kaih_harian_id', 'siswa_id', 'ta_id', 'tanggal', 'periode_bulan', 'bangun_pagi', 'beribadah', 'berolahraga', 'makan_sehat', 'gemar_belajar', 'bermasyarakat', 'tidur_cepat', 'catatan_ortu', 'updated_at'],
    (db.kaihHarian || []).map(function(k) {
      return [k.kaih_harian_id, k.siswa_id, k.ta_id, k.tanggal, k.periode_bulan, k.bangun_pagi, k.beribadah, k.berolahraga, k.makan_sehat, k.gemar_belajar, k.bermasyarakat, k.tidur_cepat, k.catatan_ortu || '', k.updated_at];
    })
  );

  replaceSheetRows_(ss, 'KAIH_Foto_Bulanan',
    ['foto_id', 'siswa_id', 'ta_id', 'periode_bulan', 'aspek_kaih', 'foto_drive_id', 'foto_url', 'keterangan', 'updated_at'],
    (db.kaihFotoBulanan || []).map(function(f) {
      return [f.foto_id, f.siswa_id, f.ta_id, f.periode_bulan, f.aspek_kaih, f.foto_drive_id || '', f.foto_url || '', f.keterangan || '', f.updated_at];
    })
  );

  replaceSheetRows_(ss, 'UlasanOrtu',
    ['ulasan_id', 'siswa_id', 'ta_id', 'periode_bulan', 'pengirim_role', 'pengirim_nama', 'isi_pesan', 'created_at'],
    (db.ulasanOrtu || []).map(function(u) {
      return [u.ulasan_id, u.siswa_id, u.ta_id, u.periode_bulan, u.pengirim_role, u.pengirim_nama, u.isi_pesan, u.created_at];
    })
  );

  replaceSheetRows_(ss, 'Log_Materi_Harian',
    ['id_log', 'tanggal', 'id_siswa', 'nama_siswa', 'kelas', 'bidang', 'kategori', 'kode_item', 'item_dipilih', 'halaman_iqra', 'status_penguasaan', 'catatan_guru', 'nama_guru', 'timestamp'],
    (db.logMateriHarian || []).map(function(l) {
      return [l.id_log, l.tanggal, l.id_siswa, l.nama_siswa, l.kelas, l.bidang, l.kategori, l.kode_item, l.item_dipilih, l.halaman_iqra || '', l.status_penguasaan, l.catatan_guru || '', l.nama_guru, l.timestamp];
    })
  );

  replaceSheetRows_(ss, 'DaftarHadir',
    ['absen_id', 'tanggal', 'periode_bulan', 'semester', 'ta_id', 'siswa_id', 'nama_anak', 'kelas', 'status', 'diinput_oleh', 'updated_at'],
    (db.daftarHadir || []).map(function(d) {
      return [d.absen_id, d.tanggal, d.periode_bulan, d.semester, d.ta_id, d.siswa_id, d.nama_anak, d.kelas, d.status, d.diinput_oleh, d.updated_at];
    })
  );

  replaceSheetRows_(ss, 'Asesmen_Anekdot',
    ['anekdot_id', 'tanggal', 'periode_bulan', 'semester', 'ta_id', 'siswa_id', 'nama_anak', 'kelas', 'deskripsi_kejadian', 'analisis_nabp', 'analisis_jd', 'analisis_lmstrs', 'umpan_balik', 'guru_nama', 'updated_at'],
    (db.asesmenAnekdot || []).map(function(a) {
      return [a.anekdot_id, a.tanggal, a.periode_bulan, a.semester, a.ta_id, a.siswa_id, a.nama_anak, a.kelas, a.deskripsi_kejadian, a.analisis_nabp, a.analisis_jd, a.analisis_lmstrs, a.umpan_balik, a.guru_nama, a.updated_at];
    })
  );

  replaceSheetRows_(ss, 'Asesmen_HasilKarya',
    ['karya_id', 'tanggal', 'periode_bulan', 'semester', 'ta_id', 'siswa_id', 'nama_anak', 'kelas', 'foto_drive_id', 'foto_url', 'deskripsi_karya', 'analisis_nabp', 'analisis_jd', 'analisis_lmstrs', 'guru_nama', 'updated_at'],
    (db.asesmenHasilKarya || []).map(function(k) {
      return [k.karya_id, k.tanggal, k.periode_bulan, k.semester, k.ta_id, k.siswa_id, k.nama_anak, k.kelas, k.foto_drive_id || '', k.foto_url || '', k.deskripsi_karya, k.analisis_nabp, k.analisis_jd, k.analisis_lmstrs, k.guru_nama, k.updated_at];
    })
  );

  replaceSheetRows_(ss, 'Asesmen_Ceklis',
    ['ceklis_id', 'tanggal', 'periode_bulan', 'semester', 'ta_id', 'siswa_id', 'nama_anak', 'kelas', 'elemen', 'kode_atp', 'tujuan_pembelajaran', 'konteks', 'status_muncul', 'kejadian_teramati', 'guru_nama', 'updated_at'],
    (db.asesmenCeklis || []).map(function(c) {
      return [c.ceklis_id, c.tanggal, c.periode_bulan, c.semester, c.ta_id, c.siswa_id, c.nama_anak, c.kelas, c.elemen, c.kode_atp, c.tujuan_pembelajaran, c.konteks, c.status_muncul, c.kejadian_teramati, c.guru_nama, c.updated_at];
    })
  );

  replaceSheetRows_(ss, 'Master_Kelas',
    ['kelas_id', 'nama_kelas', 'jenjang', 'urutan', 'aktif'],
    (db.masterKelas || []).map(function(k) {
      return [k.kelas_id, k.nama_kelas, k.jenjang || 'A', Number(k.urutan) || 1, k.aktif !== false];
    })
  );

  return { synced: true, timestamp: new Date().toISOString() };
}

function sheetToObjects_(ss, name) {
  var sh = ss.getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return [];
  var values = sh.getDataRange().getValues();
  var headers = values[0];
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = values[i][j];
    }
    rows.push(obj);
  }
  return rows;
}

function pullFullDatabase_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var cfg = getPengaturanMap_();
  return {
    pengaturanSekolah: {
      nama_sekolah: cfg.nama_sekolah || 'TK IT AL-WASHLIYAH',
      npsn: String(cfg.npsn || ''),
      alamat_sekolah: cfg.alamat_sekolah || '',
      kontak_sekolah: cfg.kontak_sekolah || '',
      kepala_sekolah: cfg.kepala_sekolah || '',
      tahun_ajaran_aktif: cfg.tahun_ajaran_aktif || '2026/2027',
      semester_aktif: cfg.semester_aktif || 'Semester 1',
      folder_drive_id: cfg.folder_drive_id || ''
    },
    users: sheetToObjects_(ss, 'Users'),
    tahunAjaran: sheetToObjects_(ss, 'TahunAjaran'),
    siswa: sheetToObjects_(ss, 'Siswa'),
    riwayatKelas: sheetToObjects_(ss, 'RiwayatKelas'),
    antropometri: sheetToObjects_(ss, 'Antropometri'),
    literasi: sheetToObjects_(ss, 'Literasi'),
    keagamaan: sheetToObjects_(ss, 'Keagamaan'),
    kaihHarian: sheetToObjects_(ss, 'KAIH_Harian'),
    kaihFotoBulanan: sheetToObjects_(ss, 'KAIH_Foto_Bulanan'),
    ulasanOrtu: sheetToObjects_(ss, 'UlasanOrtu'),
    logMateriHarian: sheetToObjects_(ss, 'Log_Materi_Harian'),
    daftarHadir: sheetToObjects_(ss, 'DaftarHadir'),
    asesmenAnekdot: sheetToObjects_(ss, 'Asesmen_Anekdot'),
    asesmenHasilKarya: sheetToObjects_(ss, 'Asesmen_HasilKarya'),
    asesmenCeklis: sheetToObjects_(ss, 'Asesmen_Ceklis'),
    masterMateri: sheetToObjects_(ss, 'Master_Materi'),
    masterTips: sheetToObjects_(ss, 'Master_Tips'),
    bankMateriHarian: sheetToObjects_(ss, 'Bank_Materi_Harian'),
    masterAtp: sheetToObjects_(ss, 'Master_ATP'),
    masterKelas: sheetToObjects_(ss, 'Master_Kelas')
  };
}

function jsonOut_(obj) {
  var envelope = {
    ok: Boolean(obj && obj.ok),
    action: (obj && obj.action) || null,
    data: obj && obj.data !== undefined ? obj.data : null,
    error: (obj && obj.error) || null,
    timestamp: (obj && obj.timestamp) || new Date().toISOString()
  };
  // Preserve extra fields like token, user, school, sheets for backward compatibility
  for (var k in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, k) && !(k in envelope)) {
      envelope[k] = obj[k];
    }
  }
  return ContentService.createTextOutput(JSON.stringify(envelope)).setMimeType(ContentService.MimeType.JSON);
}

function sha256_(text) {
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8);
  return raw.map(function(b) {
    var v = (b < 0) ? b + 256 : b;
    return (v < 16 ? '0' : '') + v.toString(16);
  }).join('');
}

function verifyToken_(token) {
  if (!token) return null;
  var cache = CacheService.getScriptCache();
  var raw = cache.get('SESS_' + token);
  return raw ? JSON.parse(raw) : null;
}

function handleLogin_(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var rows = ss.getSheetByName('Users').getDataRange().getValues();
  var hash = sha256_(String(payload.password || ''));
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][1]) === String(payload.username) && String(rows[i][2]) === hash && (rows[i][7] === true || rows[i][7] === 'YA')) {
      var token = Utilities.getUuid();
      var user = {
        user_id: rows[i][0],
        username: rows[i][1],
        role: rows[i][3],
        nama_lengkap: rows[i][4],
        kelas_ampu: rows[i][6]
      };
      CacheService.getScriptCache().put('SESS_' + token, JSON.stringify(user), 21600);
      return { ok: true, token: token, user: user };
    }
  }
  return { ok: false, error: 'Username atau password salah.' };
}

function getPengaturanMap_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('PengaturanSekolah');
  if (!sh) return {};
  var rows = sh.getDataRange().getValues();
  var map = {};
  for (var i = 1; i < rows.length; i++) map[rows[i][0]] = rows[i][1];
  return map;
}

function uploadBase64ToDrive_(base64Str, fileName, folderId) {
  var parts = base64Str.split(',');
  var bytes = Utilities.base64Decode(parts.length > 1 ? parts[1] : parts[0]);
  var blob = Utilities.newBlob(bytes, 'image/jpeg', fileName);
  var folder = DriveApp.getFolderById(folderId);
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return {
    fileId: file.getId(),
    url: 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1000'
  };
}

function trashDriveFile_(fileId) {
  if (!fileId) return;
  try { DriveApp.getFileById(fileId).setTrashed(true); } catch (e) {}
}

function saveHasilKarya_(payload, session) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Asesmen_HasilKarya');
  var rows = sheet.getDataRange().getValues();
  var count = 0;
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][5] === payload.siswa_id && rows[i][2] === payload.periode_bulan) count++;
  }
  if (!payload.karya_id && count >= 3) {
    throw new Error('Kuota maksimal 3 foto Hasil Karya per anak per bulan sudah penuh.');
  }
  var cfg = getPengaturanMap_();
  var driveRes = { fileId: payload.foto_drive_id || '', url: payload.foto_url || '' };
  if (payload.base64Image) {
    driveRes = uploadBase64ToDrive_(payload.base64Image, 'KARYA_' + payload.siswa_id + '_' + Date.now() + '.jpg', cfg.folder_karya_drive_id);
  }
  var id = payload.karya_id || ('KRY-' + Date.now());
  var now = new Date().toISOString();
  sheet.appendRow([id, payload.tanggal, payload.periode_bulan, payload.semester, payload.ta_id, payload.siswa_id, payload.nama_anak, payload.kelas, driveRes.fileId, driveRes.url, payload.deskripsi_karya, payload.analisis_nabp, payload.analisis_jd, payload.analisis_lmstrs, session.nama_lengkap, now]);
  return { karya_id: id, foto_url: driveRes.url };
}

function saveKaihFotoAspek_(payload, session) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('KAIH_Foto_Bulanan');
  var rows = sheet.getDataRange().getValues();
  var cfg = getPengaturanMap_();
  var existingRow = -1;
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][1] === payload.siswa_id && rows[i][3] === payload.periode_bulan && rows[i][4] === payload.aspek_kaih) {
      existingRow = i + 1;
      trashDriveFile_(rows[i][5]);
      break;
    }
  }
  var driveRes = uploadBase64ToDrive_(payload.base64Image, 'KAIH_' + payload.siswa_id + '_' + payload.aspek_kaih + '_' + payload.periode_bulan + '.jpg', cfg.folder_drive_id);
  var now = new Date().toISOString();
  if (existingRow > 0) {
    sheet.getRange(existingRow, 6, 1, 4).setValues([[driveRes.fileId, driveRes.url, payload.keterangan || '', now]]);
  } else {
    sheet.appendRow(['KF-' + Date.now(), payload.siswa_id, payload.ta_id, payload.periode_bulan, payload.aspek_kaih, driveRes.fileId, driveRes.url, payload.keterangan || '', now]);
  }
  return { foto_url: driveRes.url };
}

function saveDaftarHadir_(payload, session) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('DaftarHadir');
  var rows = sheet.getDataRange().getValues();
  var now = new Date().toISOString();
  (payload.entries || []).forEach(function(item) {
    var updated = false;
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][1] === payload.tanggal && rows[i][5] === item.siswa_id) {
        sheet.getRange(i + 1, 9, 1, 3).setValues([[item.status, session.nama_lengkap, now]]);
        updated = true;
        break;
      }
    }
    if (!updated) {
      sheet.appendRow(['ABS-' + Date.now() + '-' + item.siswa_id, payload.tanggal, payload.periode_bulan, payload.semester, payload.ta_id, item.siswa_id, item.nama_anak, item.kelas, item.status, session.nama_lengkap, now]);
    }
  });
  return { saved: true };
}

function getRaporBulanan(idSiswa, bulan, tahun) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var rows = ss.getSheetByName('Log_Materi_Harian').getDataRange().getValues();
  var prefix = tahun + '-' + ('0' + bulan).slice(-2);
  var filtered = [];
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][2] === idSiswa && String(rows[i][1]).indexOf(prefix) === 0) {
      filtered.push({
        tanggal: rows[i][1], bidang: rows[i][5], kategori: rows[i][6],
        item_dipilih: rows[i][8], halaman_iqra: rows[i][9],
        status_penguasaan: rows[i][10], catatan_guru: rows[i][11]
      });
    }
  }
  return { id_siswa: idSiswa, periode: prefix, logs: filtered };
}

function getRaporSatuKelas(kelas, bulan, tahun) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sRows = ss.getSheetByName('Siswa').getDataRange().getValues();
  var out = [];
  for (var i = 1; i < sRows.length; i++) {
    if (sRows[i][6] === kelas && sRows[i][7] === 'Aktif') {
      out.push(getRaporBulanan(sRows[i][0], bulan, tahun));
    }
  }
  return out;
}

function prosesKenaikanKelasOtomatis() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sSheet = ss.getSheetByName('Siswa');
  var sRows = sSheet.getDataRange().getValues();
  var kelasList = sheetToObjects_(ss, 'Master_Kelas')
    .filter(function(k) { return k.aktif !== false; })
    .sort(function(a, b) { return Number(a.urutan || 0) - Number(b.urutan || 0); });
  if (!kelasList.length) {
    kelasList = [{ nama_kelas: 'Kelas A' }, { nama_kelas: 'Kelas B' }];
  }
  var naik = 0, lulus = 0, tinggal = 0;
  var graduatedMap = {};
  for (var i = 1; i < sRows.length; i++) {
    if (sRows[i][7] !== 'Aktif') continue;
    var sid = String(sRows[i][0] || '');
    var keputusan = String(sRows[i][10] || 'BELUM_DITENTUKAN');
    if (keputusan === 'TINGGAL_KELAS') {
      tinggal++;
      continue;
    }
    var curClass = String(sRows[i][6] || '');
    var idx = -1;
    for (var j = 0; j < kelasList.length; j++) {
      if (String(kelasList[j].nama_kelas) === curClass) { idx = j; break; }
    }
    if (keputusan !== 'LULUS_KE_SD' && idx >= 0 && idx < kelasList.length - 1) {
      sSheet.getRange(i + 1, 7).setValue(kelasList[idx + 1].nama_kelas);
      if (sRows[i].length >= 11) sSheet.getRange(i + 1, 11).setValue('BELUM_DITENTUKAN');
      naik++;
    } else if (keputusan === 'LULUS_KE_SD' || idx === kelasList.length - 1 || curClass === 'Kelas B') {
      if (sid) graduatedMap[sid] = true;
      lulus++;
    }
  }
  var purgeSheets = [
    'Siswa', 'RiwayatKelas', 'Antropometri', 'Literasi', 'Keagamaan',
    'KAIH_Harian', 'KAIH_Foto_Bulanan', 'UlasanOrtu', 'Log_Materi_Harian',
    'DaftarHadir', 'Asesmen_Anekdot', 'Asesmen_HasilKarya', 'Asesmen_Ceklis'
  ];
  if (Object.keys(graduatedMap).length > 0) {
    for (var p = 0; p < purgeSheets.length; p++) {
      var sh = ss.getSheetByName(purgeSheets[p]);
      if (!sh || sh.getLastRow() < 2) continue;
      var vals = sh.getDataRange().getValues();
      var hdr = vals[0];
      var idCol = hdr.indexOf('siswa_id');
      if (idCol < 0) idCol = hdr.indexOf('id_siswa');
      if (idCol < 0) continue;
      var kept = [hdr];
      for (var r = 1; r < vals.length; r++) {
        var rowSid = String(vals[r][idCol] || '');
        if (!graduatedMap[rowSid]) kept.push(vals[r]);
      }
      if (kept.length !== vals.length) {
        sh.clearContents();
        sh.getRange(1, 1, kept.length, hdr.length).setValues(kept);
      }
    }
  }
  return { naik: naik, lulus: lulus, tinggal: tinggal, purged: Object.keys(graduatedMap).length };
}

function exportAllSheetsJson_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var out = {};
  ss.getSheets().forEach(function(sh) {
    out[sh.getName()] = sh.getDataRange().getValues();
  });
  return out;
}
`;
}
