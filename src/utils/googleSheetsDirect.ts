import { SchoolDatabase } from '../types';

export interface DriveSpreadsheetFile {
  id: string;
  name: string;
  webViewLink?: string;
  modifiedTime?: string;
}

export interface SpreadsheetMeta {
  spreadsheetId: string;
  title: string;
  spreadsheetUrl: string;
  sheetNames: string[];
}

interface SheetTablePayload {
  title: string;
  headers: string[];
  rows: (string | number | boolean)[][];
}

function buildSchoolSheetTables(db: SchoolDatabase): SheetTablePayload[] {
  const cfg = db.pengaturanSekolah;
  return [
    {
      title: 'PengaturanSekolah',
      headers: ['key', 'value', 'keterangan'],
      rows: [
        ['nama_sekolah', cfg.nama_sekolah || '', 'Nama resmi lembaga PAUD'],
        ['npsn', cfg.npsn || '', 'Nomor Pokok Sekolah Nasional'],
        ['alamat_sekolah', cfg.alamat_sekolah || '', 'Alamat lengkap sekolah'],
        ['kontak_sekolah', cfg.kontak_sekolah || '', 'Email & telepon resmi'],
        ['kepala_sekolah', cfg.kepala_sekolah || '', 'Nama Kepala Sekolah'],
        ['tahun_ajaran_aktif', cfg.tahun_ajaran_aktif || '', 'Tahun ajaran berjalan'],
        ['semester_aktif', cfg.semester_aktif || 'Semester 1', 'Semester berjalan'],
        ['folder_drive_id', cfg.folder_drive_id || '', 'ID folder Google Drive'],
      ],
    },
    {
      title: 'Users',
      headers: ['user_id', 'username', 'role', 'nama_lengkap', 'no_hp', 'kelas_ampu', 'status_aktif'],
      rows: db.users.map((u) => [
        u.user_id,
        u.username,
        u.role,
        u.nama_lengkap,
        u.no_hp || '',
        u.kelas_ampu || '',
        Boolean(u.status_aktif),
      ]),
    },
    {
      title: 'TahunAjaran',
      headers: ['ta_id', 'nama_ta', 'tanggal_mulai', 'tanggal_selesai', 'status_aktif'],
      rows: db.tahunAjaran.map((t) => [
        t.ta_id,
        t.nama_ta,
        t.tanggal_mulai,
        t.tanggal_selesai,
        Boolean(t.status_aktif),
      ]),
    },
    {
      title: 'Siswa',
      headers: [
        'siswa_id',
        'nis',
        'nama_anak',
        'jenis_kelamin',
        'tanggal_lahir',
        'ortu_user_id',
        'kelas_aktif',
        'status_siswa',
        'target_literasi_kelas_b',
        'target_kustom_kelas_b',
        'keputusan_kenaikan',
        'catatan_kenaikan',
        'keputusan_diatur_oleh',
      ],
      rows: db.siswa.map((s) => [
        s.siswa_id,
        s.nis,
        s.nama_anak,
        s.jenis_kelamin,
        s.tanggal_lahir,
        s.ortu_user_id || '',
        s.kelas_aktif,
        s.status_siswa,
        s.target_literasi_kelas_b,
        s.target_kustom_kelas_b || '',
        s.keputusan_kenaikan || 'BELUM_DITENTUKAN',
        s.catatan_kenaikan || '',
        s.keputusan_diatur_oleh || '',
      ]),
    },
    {
      title: 'RiwayatKelas',
      headers: ['riwayat_id', 'siswa_id', 'ta_id', 'nama_ta', 'kelas', 'wali_kelas_id', 'status_akhir', 'catatan'],
      rows: db.riwayatKelas.map((r) => [
        r.riwayat_id,
        r.siswa_id,
        r.ta_id,
        r.nama_ta || '',
        r.kelas,
        r.wali_kelas_id || '',
        r.status_akhir,
        r.catatan || '',
      ]),
    },
    {
      title: 'Antropometri',
      headers: [
        'log_id',
        'siswa_id',
        'ta_id',
        'periode_bulan',
        'usia_bulan',
        'bb_kg',
        'tb_cm',
        'lk_cm',
        'lila_cm',
        'status_gizi_otomatis',
        'kode_pemicu_tips',
        'catatan_guru',
        'updated_at',
      ],
      rows: db.antropometri.map((a) => [
        a.log_id,
        a.siswa_id,
        a.ta_id,
        a.periode_bulan,
        a.usia_bulan,
        a.bb_kg,
        a.tb_cm,
        a.lk_cm,
        a.lila_cm,
        a.status_gizi_otomatis,
        a.kode_pemicu_tips,
        a.catatan_guru || '',
        a.updated_at,
      ]),
    },
    {
      title: 'Literasi',
      headers: [
        'lit_id',
        'siswa_id',
        'ta_id',
        'periode_bulan',
        'kelas',
        'track_level_dipilih',
        'target_kustom',
        'nilai_huruf_atau_dasar',
        'nilai_sukukata_atau_lanjutan',
        'nilai_kalimat_opsional',
        'catatan_guru',
        'updated_at',
      ],
      rows: db.literasi.map((l) => [
        l.lit_id,
        l.siswa_id,
        l.ta_id,
        l.periode_bulan,
        l.kelas,
        l.track_level_dipilih,
        l.target_kustom || '',
        l.nilai_huruf_atau_dasar,
        l.nilai_sukukata_atau_lanjutan,
        l.nilai_kalimat_opsional || '',
        l.catatan_guru || '',
        l.updated_at,
      ]),
    },
    {
      title: 'Keagamaan',
      headers: [
        'agama_id',
        'siswa_id',
        'ta_id',
        'periode_bulan',
        'kategori',
        'materi_id',
        'nama_materi',
        'status_progres',
        'catatan_guru',
        'updated_at',
      ],
      rows: db.keagamaan.map((k) => [
        k.agama_id,
        k.siswa_id,
        k.ta_id,
        k.periode_bulan,
        k.kategori,
        k.materi_id,
        k.nama_materi,
        k.status_progres,
        k.catatan_guru || '',
        k.updated_at,
      ]),
    },
    {
      title: 'KAIH_Harian',
      headers: [
        'kaih_harian_id',
        'siswa_id',
        'ta_id',
        'tanggal',
        'periode_bulan',
        'bangun_pagi',
        'beribadah',
        'berolahraga',
        'makan_sehat',
        'gemar_belajar',
        'bermasyarakat',
        'tidur_cepat',
        'catatan_ortu',
        'updated_at',
      ],
      rows: db.kaihHarian.map((k) => [
        k.kaih_harian_id,
        k.siswa_id,
        k.ta_id,
        k.tanggal,
        k.periode_bulan,
        k.bangun_pagi,
        k.beribadah,
        k.berolahraga,
        k.makan_sehat,
        k.gemar_belajar,
        k.bermasyarakat,
        k.tidur_cepat,
        k.catatan_ortu || '',
        k.updated_at,
      ]),
    },
    {
      title: 'Log_Materi_Harian',
      headers: [
        'id_log',
        'tanggal',
        'id_siswa',
        'nama_siswa',
        'kelas',
        'bidang',
        'kategori',
        'kode_item',
        'item_dipilih',
        'halaman_iqra',
        'status_penguasaan',
        'catatan_guru',
        'nama_guru',
        'timestamp',
      ],
      rows: db.logMateriHarian.map((l) => [
        l.id_log,
        l.tanggal,
        l.id_siswa,
        l.nama_siswa,
        l.kelas,
        l.bidang,
        l.kategori,
        l.kode_item,
        l.item_dipilih,
        l.halaman_iqra || '',
        l.status_penguasaan,
        l.catatan_guru || '',
        l.nama_guru,
        l.timestamp,
      ]),
    },
    {
      title: 'DaftarHadir',
      headers: [
        'absen_id',
        'tanggal',
        'periode_bulan',
        'semester',
        'ta_id',
        'siswa_id',
        'nama_anak',
        'kelas',
        'status',
        'diinput_oleh',
        'updated_at',
      ],
      rows: db.daftarHadir.map((d) => [
        d.absen_id,
        d.tanggal,
        d.periode_bulan,
        d.semester,
        d.ta_id,
        d.siswa_id,
        d.nama_anak,
        d.kelas,
        d.status,
        d.diinput_oleh,
        d.updated_at,
      ]),
    },
    {
      title: 'Asesmen_Anekdot',
      headers: [
        'anekdot_id',
        'tanggal',
        'periode_bulan',
        'semester',
        'ta_id',
        'siswa_id',
        'nama_anak',
        'kelas',
        'deskripsi_kejadian',
        'analisis_nabp',
        'analisis_jd',
        'analisis_lmstrs',
        'umpan_balik',
        'guru_nama',
        'updated_at',
      ],
      rows: db.asesmenAnekdot.map((a) => [
        a.anekdot_id,
        a.tanggal,
        a.periode_bulan,
        a.semester,
        a.ta_id,
        a.siswa_id,
        a.nama_anak,
        a.kelas,
        a.deskripsi_kejadian,
        a.analisis_nabp,
        a.analisis_jd,
        a.analisis_lmstrs,
        a.umpan_balik,
        a.guru_nama,
        a.updated_at,
      ]),
    },
    {
      title: 'Asesmen_Ceklis',
      headers: [
        'ceklis_id',
        'tanggal',
        'periode_bulan',
        'semester',
        'ta_id',
        'siswa_id',
        'nama_anak',
        'kelas',
        'elemen',
        'kode_atp',
        'tujuan_pembelajaran',
        'konteks',
        'status_muncul',
        'kejadian_teramati',
        'guru_nama',
        'updated_at',
      ],
      rows: db.asesmenCeklis.map((c) => [
        c.ceklis_id,
        c.tanggal,
        c.periode_bulan,
        c.semester,
        c.ta_id,
        c.siswa_id,
        c.nama_anak,
        c.kelas,
        c.elemen,
        c.kode_atp,
        c.tujuan_pembelajaran,
        c.konteks,
        c.status_muncul,
        c.kejadian_teramati,
        c.guru_nama,
        c.updated_at,
      ]),
    },
    {
      title: 'UlasanOrtu',
      headers: ['ulasan_id', 'siswa_id', 'ta_id', 'periode_bulan', 'pengirim_role', 'pengirim_nama', 'isi_pesan', 'created_at'],
      rows: db.ulasanOrtu.map((u) => [
        u.ulasan_id,
        u.siswa_id,
        u.ta_id,
        u.periode_bulan,
        u.pengirim_role,
        u.pengirim_nama,
        u.isi_pesan,
        u.created_at,
      ]),
    },
    {
      title: 'Master_Kelas',
      headers: ['kelas_id', 'nama_kelas', 'jenjang', 'urutan', 'aktif'],
      rows: (db.masterKelas || []).map((k) => [
        k.kelas_id,
        k.nama_kelas,
        k.jenjang,
        k.urutan,
        Boolean(k.aktif),
      ]),
    },
  ];
}

export async function listUserSpreadsheets(accessToken: string): Promise<DriveSpreadsheetFile[]> {
  const q = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&orderBy=modifiedTime desc&pageSize=15&fields=files(id,name,webViewLink,modifiedTime)`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error?.message || 'Gagal memuat daftar Spreadsheet dari Google Drive.');
  }
  return (json.files || []) as DriveSpreadsheetFile[];
}

export async function fetchSpreadsheetMeta(
  accessToken: string,
  spreadsheetId: string
): Promise<SpreadsheetMeta> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}?fields=spreadsheetId,spreadsheetUrl,properties.title,sheets.properties.title`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error?.message || 'Spreadsheet tidak ditemukan atau akses ditolak.');
  }
  return {
    spreadsheetId: json.spreadsheetId,
    title: json.properties?.title || 'Spreadsheet Sekolah',
    spreadsheetUrl:
      json.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${json.spreadsheetId}/edit`,
    sheetNames: (json.sheets || []).map((s: { properties?: { title?: string } }) => s.properties?.title || '').filter(Boolean),
  };
}

export async function createSchoolSpreadsheet(
  accessToken: string,
  title: string,
  db: SchoolDatabase
): Promise<SpreadsheetMeta> {
  const tables = buildSchoolSheetTables(db);
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title },
      sheets: tables.map((t) => ({ properties: { title: t.title } })),
    }),
  });
  const created = await createRes.json();
  if (!createRes.ok) {
    throw new Error(created?.error?.message || 'Gagal membuat Google Spreadsheet baru.');
  }

  const spreadsheetId = created.spreadsheetId as string;
  const meta: SpreadsheetMeta = {
    spreadsheetId,
    title: created.properties?.title || title,
    spreadsheetUrl:
      created.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    sheetNames: tables.map((t) => t.title),
  };

  await writeTablesToSpreadsheet(accessToken, spreadsheetId, tables);
  return meta;
}

async function writeTablesToSpreadsheet(
  accessToken: string,
  spreadsheetId: string,
  tables: SheetTablePayload[]
): Promise<void> {
  const valueRanges = tables.map((t) => ({
    range: `'${t.title}'!A1`,
    majorDimension: 'ROWS',
    values: [t.headers, ...t.rows],
  }));

  const batchRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: valueRanges,
      }),
    }
  );
  const batchJson = await batchRes.json();
  if (!batchRes.ok) {
    throw new Error(batchJson?.error?.message || 'Gagal menulis data ke Google Sheets.');
  }
}

export async function syncSchoolDatabaseToSpreadsheet(
  accessToken: string,
  spreadsheetId: string,
  db: SchoolDatabase
): Promise<{ meta: SpreadsheetMeta; tabsUpdated: number }> {
  // Always inspect spreadsheet metadata first instead of assuming tab names exist
  const meta = await fetchSpreadsheetMeta(accessToken, spreadsheetId);
  const tables = buildSchoolSheetTables(db);

  const missingTitles = tables
    .map((t) => t.title)
    .filter((title) => !meta.sheetNames.includes(title));

  if (missingTitles.length > 0) {
    const addRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: missingTitles.map((title) => ({
            addSheet: { properties: { title } },
          })),
        }),
      }
    );
    const addJson = await addRes.json();
    if (!addRes.ok) {
      throw new Error(addJson?.error?.message || 'Gagal menambahkan tab sheet baru.');
    }
  }

  // Clear existing ranges before writing fresh tables
  const clearRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values:batchClear`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ranges: tables.map((t) => `'${t.title}'!A:Z`),
      }),
    }
  );
  if (!clearRes.ok) {
    const errJson = await clearRes.json().catch(() => ({}));
    throw new Error(errJson?.error?.message || 'Gagal membersihkan rentang sheet lama.');
  }

  await writeTablesToSpreadsheet(accessToken, spreadsheetId, tables);
  const updatedMeta = await fetchSpreadsheetMeta(accessToken, spreadsheetId);
  return { meta: updatedMeta, tabsUpdated: tables.length };
}
