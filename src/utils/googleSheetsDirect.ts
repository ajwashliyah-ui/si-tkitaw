import {
  AntropometriRecord,
  AsesmenAnekdot,
  AsesmenCeklis,
  AsesmenHasilKarya,
  AspekKaihKey,
  BankMateriHarian,
  DaftarHadirRecord,
  KaihFotoAspekBulanan,
  KaihHarianRecord,
  KeagamaanRecord,
  KeputusanKenaikan,
  LiterasiRecord,
  LogMateriHarian,
  MasterAtp,
  MasterKelas,
  MasterMateri,
  MasterTips,
  RiwayatKelas,
  SchoolDatabase,
  SemesterType,
  Siswa,
  SkalaKaih,
  SkalaLiterasi,
  StatusAbsensi,
  StatusKeagamaan,
  StatusPenguasaanHarian,
  StatusSiswa,
  TahunAjaran,
  TrackKelasB,
  UlasanOrtu,
  User,
  UserRole,
} from '../types';

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

export interface SheetTablePayload {
  title: string;
  headers: string[];
  rows: (string | number | boolean)[][];
}

const MAX_SHEET_CELL_CHARS = 45000;
const LOCAL_PHOTO_MARKER_PREFIX = '[Foto tersimpan di aplikasi';

export function extractSpreadsheetId(raw: string): string {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return '';
  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch?.[1]) return urlMatch[1];
  return trimmed;
}

export function sanitizeCellForSheets(val: unknown): string | number | boolean {
  if (val === null || val === undefined) return '';
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return Number.isFinite(val) ? val : '';
  const str = String(val);
  if (str.length <= MAX_SHEET_CELL_CHARS) return str;
  const approxKb = Math.max(1, Math.round((str.length * 3) / 4 / 1024));
  if (str.startsWith('data:image/')) {
    return `${LOCAL_PHOTO_MARKER_PREFIX} (${approxKb} KB)]`;
  }
  return `${str.slice(0, MAX_SHEET_CELL_CHARS - 16)}... (terpotong)`;
}

export function buildSchoolSheetTables(db: SchoolDatabase): SheetTablePayload[] {
  const cfg = db.pengaturanSekolah;
  const rawTables: SheetTablePayload[] = [
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
        ['google_spreadsheet_id', cfg.google_spreadsheet_id || '', 'ID Spreadsheet terhubung'],
        ['google_spreadsheet_url', cfg.google_spreadsheet_url || '', 'URL Spreadsheet terhubung'],
        ['auto_sync_sheets', String(cfg.auto_sync_sheets !== false), 'Sinkronisasi real-time'],
        ['admin_claimed', String(Boolean(cfg.admin_claimed)), 'Status aktivasi Admin'],
      ],
    },
    {
      title: 'Users',
      headers: ['user_id', 'username', 'password_hash', 'role', 'nama_lengkap', 'no_hp', 'kelas_ampu', 'status_aktif'],
      rows: (db.users || []).map((u) => [
        u.user_id,
        u.username,
        u.password_hash || '',
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
      rows: (db.tahunAjaran || []).map((t) => [
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
      rows: (db.siswa || []).map((s) => [
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
      rows: (db.riwayatKelas || []).map((r) => [
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
      rows: (db.antropometri || []).map((a) => [
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
      rows: (db.literasi || []).map((l) => [
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
      rows: (db.keagamaan || []).map((k) => [
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
      rows: (db.kaihHarian || []).map((k) => [
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
      title: 'KAIH_Foto_Bulanan',
      headers: [
        'foto_id',
        'siswa_id',
        'ta_id',
        'periode_bulan',
        'aspek_kaih',
        'foto_drive_id',
        'foto_url',
        'keterangan',
        'updated_at',
      ],
      rows: (db.kaihFotoBulanan || []).map((f) => [
        f.foto_id,
        f.siswa_id,
        f.ta_id,
        f.periode_bulan,
        f.aspek_kaih,
        f.foto_drive_id || '',
        f.foto_url || '',
        f.keterangan || '',
        f.updated_at,
      ]),
    },
    {
      title: 'UlasanOrtu',
      headers: ['ulasan_id', 'siswa_id', 'ta_id', 'periode_bulan', 'pengirim_role', 'pengirim_nama', 'isi_pesan', 'created_at'],
      rows: (db.ulasanOrtu || []).map((u) => [
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
      title: 'Log_Materi_Harian',
      headers: [
        'id_log',
        'tanggal',
        'id_siswa',
        'nama_siswa',
        'kelas',
        'ta_id',
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
      rows: (db.logMateriHarian || []).map((l) => [
        l.id_log,
        l.tanggal,
        l.id_siswa,
        l.nama_siswa,
        l.kelas,
        l.ta_id || '',
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
      rows: (db.daftarHadir || []).map((d) => [
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
      rows: (db.asesmenAnekdot || []).map((a) => [
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
      title: 'Asesmen_HasilKarya',
      headers: [
        'karya_id',
        'tanggal',
        'periode_bulan',
        'semester',
        'ta_id',
        'siswa_id',
        'nama_anak',
        'kelas',
        'foto_drive_id',
        'foto_url',
        'deskripsi_karya',
        'analisis_nabp',
        'analisis_jd',
        'analisis_lmstrs',
        'guru_nama',
        'updated_at',
      ],
      rows: (db.asesmenHasilKarya || []).map((k) => [
        k.karya_id,
        k.tanggal,
        k.periode_bulan,
        k.semester,
        k.ta_id,
        k.siswa_id,
        k.nama_anak,
        k.kelas,
        k.foto_drive_id || '',
        k.foto_url || '',
        k.deskripsi_karya,
        k.analisis_nabp,
        k.analisis_jd,
        k.analisis_lmstrs,
        k.guru_nama,
        k.updated_at,
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
      rows: (db.asesmenCeklis || []).map((c) => [
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
      title: 'Master_Materi',
      headers: ['materi_id', 'kategori', 'nama_materi', 'urutan', 'aktif'],
      rows: (db.masterMateri || []).map((m) => [
        m.materi_id,
        m.kategori,
        m.nama_materi,
        m.urutan,
        Boolean(m.aktif),
      ]),
    },
    {
      title: 'Master_Tips',
      headers: ['tips_id', 'kategori_pemicu', 'kondisi_pemicu', 'judul_tips', 'isi_tips_ayah_bunda', 'aktif'],
      rows: (db.masterTips || []).map((t) => [
        t.tips_id,
        t.kategori_pemicu,
        t.kondisi_pemicu,
        t.judul_tips,
        t.isi_tips_ayah_bunda,
        Boolean(t.aktif),
      ]),
    },
    {
      title: 'Bank_Materi_Harian',
      headers: ['kode_item', 'bidang', 'level_track', 'kategori', 'label_kelompok', 'isi_item', 'pertanyaan_cek', 'aktif'],
      rows: (db.bankMateriHarian || []).map((b) => [
        b.kode_item,
        b.bidang,
        b.level_track,
        b.kategori,
        b.label_kelompok,
        b.isi_item,
        b.pertanyaan_cek || '',
        Boolean(b.aktif),
      ]),
    },
    {
      title: 'Master_ATP',
      headers: ['atp_uid', 'kelompok', 'semester_target', 'elemen', 'kode_atp', 'tujuan_pembelajaran', 'aktif'],
      rows: (db.masterAtp || []).map((a) => [
        a.atp_uid,
        a.kelompok,
        a.semester_target,
        a.elemen,
        a.kode_atp,
        a.tujuan_pembelajaran,
        Boolean(a.aktif),
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

  return rawTables.map((table) => ({
    ...table,
    rows: table.rows.map((row) => row.map(sanitizeCellForSheets)),
  }));
}

function toBool(v: unknown, fallback = true): boolean {
  if (typeof v === 'boolean') return v;
  const s = String(v ?? '').trim().toLowerCase();
  if (!s) return fallback;
  return s === 'true' || s === 'ya' || s === '1' || s === 'yes';
}

function toNum(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
}

function toStr(v: unknown): string {
  return v === null || v === undefined ? '' : String(v);
}

function rowsToObjects(values: unknown[][] | undefined): Record<string, unknown>[] {
  if (!values || values.length < 2) return [];
  const headers = values[0].map((h) => String(h ?? '').trim());
  const out: Record<string, unknown>[] = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (!row || row.every((c) => c === '' || c === null || c === undefined)) continue;
    const obj: Record<string, unknown> = {};
    for (let j = 0; j < headers.length; j++) {
      if (headers[j]) obj[headers[j]] = row[j] ?? '';
    }
    out.push(obj);
  }
  return out;
}

export function parsePulledSheetTables(
  tablesByTitle: Record<string, unknown[][]>,
  currentDb: SchoolDatabase
): SchoolDatabase {
  const cfgRows = rowsToObjects(tablesByTitle.PengaturanSekolah);
  const cfgMap: Record<string, string> = {};
  for (const r of cfgRows) {
    const k = toStr(r.key).trim();
    if (k) cfgMap[k] = toStr(r.value);
  }

  const currentUsersById = new Map(currentDb.users.map((u) => [u.user_id, u]));
  const currentUsersByUsername = new Map(
    currentDb.users.map((u) => [u.username.trim().replace(/^@+/, '').toLowerCase(), u])
  );
  const userRows = rowsToObjects(tablesByTitle.Users);
  const parsedUsers: User[] = userRows.map((r) => {
    const uid = toStr(r.user_id);
    const uname = toStr(r.username).trim().replace(/^@+/, '').toLowerCase();
    const existing = currentUsersById.get(uid) || currentUsersByUsername.get(uname);
    return {
      user_id: uid,
      username: uname,
      password_hash: toStr(r.password_hash) || existing?.password_hash || '',
      role: (toStr(r.role) as UserRole) || 'OrangTua',
      nama_lengkap: toStr(r.nama_lengkap),
      no_hp: toStr(r.no_hp),
      kelas_ampu: toStr(r.kelas_ampu),
      status_aktif: toBool(r.status_aktif, true),
    };
  });
  for (const adm of currentDb.users.filter((u) => u.role === 'Admin')) {
    if (!parsedUsers.some((u) => u.user_id === adm.user_id || u.role === 'Admin')) {
      parsedUsers.unshift(adm);
    }
  }

  const oldKaihFotoMap = new Map(currentDb.kaihFotoBulanan.map((f) => [f.foto_id, f.foto_url]));
  const oldKaryaFotoMap = new Map(currentDb.asesmenHasilKarya.map((k) => [k.karya_id, k.foto_url]));

  const resolvePhotoUrl = (rawUrl: string, id: string, oldMap: Map<string, string>): string => {
    if (rawUrl.startsWith(LOCAL_PHOTO_MARKER_PREFIX)) {
      return oldMap.get(id) || '';
    }
    return rawUrl;
  };

  return {
    ...currentDb,
    pengaturanSekolah: {
      ...currentDb.pengaturanSekolah,
      ...(cfgMap.nama_sekolah ? { nama_sekolah: cfgMap.nama_sekolah } : {}),
      ...(cfgMap.npsn !== undefined ? { npsn: cfgMap.npsn } : {}),
      ...(cfgMap.alamat_sekolah !== undefined ? { alamat_sekolah: cfgMap.alamat_sekolah } : {}),
      ...(cfgMap.kontak_sekolah !== undefined ? { kontak_sekolah: cfgMap.kontak_sekolah } : {}),
      ...(cfgMap.kepala_sekolah !== undefined ? { kepala_sekolah: cfgMap.kepala_sekolah } : {}),
      ...(cfgMap.tahun_ajaran_aktif ? { tahun_ajaran_aktif: cfgMap.tahun_ajaran_aktif } : {}),
      ...(cfgMap.semester_aktif
        ? { semester_aktif: cfgMap.semester_aktif as SemesterType }
        : {}),
      ...(cfgMap.folder_drive_id !== undefined ? { folder_drive_id: cfgMap.folder_drive_id } : {}),
      ...(cfgMap.google_spreadsheet_id
        ? { google_spreadsheet_id: cfgMap.google_spreadsheet_id }
        : {}),
      ...(cfgMap.google_spreadsheet_url
        ? { google_spreadsheet_url: cfgMap.google_spreadsheet_url }
        : {}),
      ...(cfgMap.auto_sync_sheets !== undefined
        ? { auto_sync_sheets: toBool(cfgMap.auto_sync_sheets, true) }
        : {}),
      ...(cfgMap.admin_claimed !== undefined
        ? { admin_claimed: Boolean(currentDb.pengaturanSekolah.admin_claimed) || toBool(cfgMap.admin_claimed, false) }
        : {}),
    },
    users: tablesByTitle.Users ? parsedUsers : currentDb.users,
    tahunAjaran: tablesByTitle.TahunAjaran
      ? rowsToObjects(tablesByTitle.TahunAjaran).map(
          (r): TahunAjaran => ({
            ta_id: toStr(r.ta_id),
            nama_ta: toStr(r.nama_ta),
            tanggal_mulai: toStr(r.tanggal_mulai),
            tanggal_selesai: toStr(r.tanggal_selesai),
            status_aktif: toBool(r.status_aktif, false),
          })
        )
      : currentDb.tahunAjaran,
    siswa: tablesByTitle.Siswa
      ? rowsToObjects(tablesByTitle.Siswa).map(
          (r): Siswa => ({
            siswa_id: toStr(r.siswa_id),
            nis: toStr(r.nis),
            nama_anak: toStr(r.nama_anak),
            jenis_kelamin: toStr(r.jenis_kelamin) === 'P' ? 'P' : 'L',
            tanggal_lahir: toStr(r.tanggal_lahir),
            ortu_user_id: toStr(r.ortu_user_id),
            kelas_aktif: toStr(r.kelas_aktif),
            status_siswa: (toStr(r.status_siswa) as StatusSiswa) || 'Aktif',
            target_literasi_kelas_b: (toStr(r.target_literasi_kelas_b) as TrackKelasB) || 'TRACK_1',
            target_kustom_kelas_b: toStr(r.target_kustom_kelas_b),
            keputusan_kenaikan: (toStr(r.keputusan_kenaikan) as KeputusanKenaikan) || 'BELUM_DITENTUKAN',
            catatan_kenaikan: toStr(r.catatan_kenaikan),
            keputusan_diatur_oleh: toStr(r.keputusan_diatur_oleh),
          })
        )
      : currentDb.siswa,
    riwayatKelas: tablesByTitle.RiwayatKelas
      ? rowsToObjects(tablesByTitle.RiwayatKelas).map(
          (r): RiwayatKelas => ({
            riwayat_id: toStr(r.riwayat_id),
            siswa_id: toStr(r.siswa_id),
            ta_id: toStr(r.ta_id),
            nama_ta: toStr(r.nama_ta),
            kelas: toStr(r.kelas),
            wali_kelas_id: toStr(r.wali_kelas_id),
            status_akhir: (toStr(r.status_akhir) as RiwayatKelas['status_akhir']) || 'Berjalan',
            catatan: toStr(r.catatan),
          })
        )
      : currentDb.riwayatKelas,
    antropometri: tablesByTitle.Antropometri
      ? rowsToObjects(tablesByTitle.Antropometri).map(
          (r): AntropometriRecord => ({
            log_id: toStr(r.log_id),
            siswa_id: toStr(r.siswa_id),
            ta_id: toStr(r.ta_id),
            periode_bulan: toStr(r.periode_bulan),
            usia_bulan: toNum(r.usia_bulan),
            bb_kg: toNum(r.bb_kg),
            tb_cm: toNum(r.tb_cm),
            lk_cm: toNum(r.lk_cm),
            lila_cm: toNum(r.lila_cm),
            status_gizi_otomatis: toStr(r.status_gizi_otomatis),
            kode_pemicu_tips: toStr(r.kode_pemicu_tips),
            catatan_guru: toStr(r.catatan_guru),
            updated_at: toStr(r.updated_at),
          })
        )
      : currentDb.antropometri,
    literasi: tablesByTitle.Literasi
      ? rowsToObjects(tablesByTitle.Literasi).map(
          (r): LiterasiRecord => ({
            lit_id: toStr(r.lit_id),
            siswa_id: toStr(r.siswa_id),
            ta_id: toStr(r.ta_id),
            periode_bulan: toStr(r.periode_bulan),
            kelas: toStr(r.kelas),
            track_level_dipilih: (toStr(r.track_level_dipilih) as LiterasiRecord['track_level_dipilih']) || 'STANDAR_A',
            target_kustom: toStr(r.target_kustom),
            nilai_huruf_atau_dasar: toStr(r.nilai_huruf_atau_dasar) as SkalaLiterasi,
            nilai_sukukata_atau_lanjutan: toStr(r.nilai_sukukata_atau_lanjutan) as SkalaLiterasi,
            nilai_kalimat_opsional: toStr(r.nilai_kalimat_opsional) as SkalaLiterasi | '',
            catatan_guru: toStr(r.catatan_guru),
            updated_at: toStr(r.updated_at),
          })
        )
      : currentDb.literasi,
    keagamaan: tablesByTitle.Keagamaan
      ? rowsToObjects(tablesByTitle.Keagamaan).map(
          (r): KeagamaanRecord => ({
            agama_id: toStr(r.agama_id),
            siswa_id: toStr(r.siswa_id),
            ta_id: toStr(r.ta_id),
            periode_bulan: toStr(r.periode_bulan),
            kategori: toStr(r.kategori) as KeagamaanRecord['kategori'],
            materi_id: toStr(r.materi_id),
            nama_materi: toStr(r.nama_materi),
            status_progres: toStr(r.status_progres) as StatusKeagamaan,
            catatan_guru: toStr(r.catatan_guru),
            updated_at: toStr(r.updated_at),
          })
        )
      : currentDb.keagamaan,
    kaihHarian: tablesByTitle.KAIH_Harian
      ? rowsToObjects(tablesByTitle.KAIH_Harian).map(
          (r): KaihHarianRecord => ({
            kaih_harian_id: toStr(r.kaih_harian_id),
            siswa_id: toStr(r.siswa_id),
            ta_id: toStr(r.ta_id),
            tanggal: toStr(r.tanggal),
            periode_bulan: toStr(r.periode_bulan),
            bangun_pagi: toStr(r.bangun_pagi) as SkalaKaih,
            beribadah: toStr(r.beribadah) as SkalaKaih,
            berolahraga: toStr(r.berolahraga) as SkalaKaih,
            makan_sehat: toStr(r.makan_sehat) as SkalaKaih,
            gemar_belajar: toStr(r.gemar_belajar) as SkalaKaih,
            bermasyarakat: toStr(r.bermasyarakat) as SkalaKaih,
            tidur_cepat: toStr(r.tidur_cepat) as SkalaKaih,
            catatan_ortu: toStr(r.catatan_ortu),
            updated_at: toStr(r.updated_at),
          })
        )
      : currentDb.kaihHarian,
    kaihFotoBulanan: tablesByTitle.KAIH_Foto_Bulanan
      ? rowsToObjects(tablesByTitle.KAIH_Foto_Bulanan).map((r): KaihFotoAspekBulanan => {
          const fotoId = toStr(r.foto_id);
          return {
            foto_id: fotoId,
            siswa_id: toStr(r.siswa_id),
            ta_id: toStr(r.ta_id),
            periode_bulan: toStr(r.periode_bulan),
            aspek_kaih: toStr(r.aspek_kaih) as AspekKaihKey,
            foto_drive_id: toStr(r.foto_drive_id),
            foto_url: resolvePhotoUrl(toStr(r.foto_url), fotoId, oldKaihFotoMap),
            keterangan: toStr(r.keterangan),
            updated_at: toStr(r.updated_at),
          };
        })
      : currentDb.kaihFotoBulanan,
    ulasanOrtu: tablesByTitle.UlasanOrtu
      ? rowsToObjects(tablesByTitle.UlasanOrtu).map(
          (r): UlasanOrtu => ({
            ulasan_id: toStr(r.ulasan_id),
            siswa_id: toStr(r.siswa_id),
            ta_id: toStr(r.ta_id),
            periode_bulan: toStr(r.periode_bulan),
            pengirim_role: toStr(r.pengirim_role) === 'Guru' ? 'Guru' : 'OrangTua',
            pengirim_nama: toStr(r.pengirim_nama),
            isi_pesan: toStr(r.isi_pesan),
            created_at: toStr(r.created_at),
          })
        )
      : currentDb.ulasanOrtu,
    logMateriHarian: tablesByTitle.Log_Materi_Harian
      ? rowsToObjects(tablesByTitle.Log_Materi_Harian).map(
          (r): LogMateriHarian => ({
            id_log: toStr(r.id_log),
            tanggal: toStr(r.tanggal),
            id_siswa: toStr(r.id_siswa),
            nama_siswa: toStr(r.nama_siswa),
            kelas: toStr(r.kelas),
            ta_id: toStr(r.ta_id) || currentDb.tahunAjaran.find((t) => t.status_aktif)?.ta_id || 'TA-2026-2027',
            bidang: toStr(r.bidang) as LogMateriHarian['bidang'],
            kategori: toStr(r.kategori) as LogMateriHarian['kategori'],
            kode_item: toStr(r.kode_item),
            item_dipilih: toStr(r.item_dipilih),
            halaman_iqra: toStr(r.halaman_iqra),
            status_penguasaan: toStr(r.status_penguasaan) as StatusPenguasaanHarian,
            catatan_guru: toStr(r.catatan_guru),
            nama_guru: toStr(r.nama_guru),
            timestamp: toStr(r.timestamp),
          })
        )
      : currentDb.logMateriHarian,
    daftarHadir: tablesByTitle.DaftarHadir
      ? rowsToObjects(tablesByTitle.DaftarHadir).map(
          (r): DaftarHadirRecord => ({
            absen_id: toStr(r.absen_id),
            tanggal: toStr(r.tanggal),
            periode_bulan: toStr(r.periode_bulan),
            semester: (toStr(r.semester) as SemesterType) || 'Semester 1',
            ta_id: toStr(r.ta_id),
            siswa_id: toStr(r.siswa_id),
            nama_anak: toStr(r.nama_anak),
            kelas: toStr(r.kelas),
            status: (toStr(r.status) as StatusAbsensi) || 'HADIR',
            diinput_oleh: toStr(r.diinput_oleh),
            updated_at: toStr(r.updated_at),
          })
        )
      : currentDb.daftarHadir,
    asesmenAnekdot: tablesByTitle.Asesmen_Anekdot
      ? rowsToObjects(tablesByTitle.Asesmen_Anekdot).map(
          (r): AsesmenAnekdot => ({
            anekdot_id: toStr(r.anekdot_id),
            tanggal: toStr(r.tanggal),
            periode_bulan: toStr(r.periode_bulan),
            semester: (toStr(r.semester) as SemesterType) || 'Semester 1',
            ta_id: toStr(r.ta_id),
            siswa_id: toStr(r.siswa_id),
            nama_anak: toStr(r.nama_anak),
            kelas: toStr(r.kelas),
            deskripsi_kejadian: toStr(r.deskripsi_kejadian),
            analisis_nabp: toStr(r.analisis_nabp),
            analisis_jd: toStr(r.analisis_jd),
            analisis_lmstrs: toStr(r.analisis_lmstrs),
            umpan_balik: toStr(r.umpan_balik),
            guru_nama: toStr(r.guru_nama),
            updated_at: toStr(r.updated_at),
          })
        )
      : currentDb.asesmenAnekdot,
    asesmenHasilKarya: tablesByTitle.Asesmen_HasilKarya
      ? rowsToObjects(tablesByTitle.Asesmen_HasilKarya).map((r): AsesmenHasilKarya => {
          const karyaId = toStr(r.karya_id);
          return {
            karya_id: karyaId,
            tanggal: toStr(r.tanggal),
            periode_bulan: toStr(r.periode_bulan),
            semester: (toStr(r.semester) as SemesterType) || 'Semester 1',
            ta_id: toStr(r.ta_id),
            siswa_id: toStr(r.siswa_id),
            nama_anak: toStr(r.nama_anak),
            kelas: toStr(r.kelas),
            foto_drive_id: toStr(r.foto_drive_id),
            foto_url: resolvePhotoUrl(toStr(r.foto_url), karyaId, oldKaryaFotoMap),
            deskripsi_karya: toStr(r.deskripsi_karya),
            analisis_nabp: toStr(r.analisis_nabp),
            analisis_jd: toStr(r.analisis_jd),
            analisis_lmstrs: toStr(r.analisis_lmstrs),
            guru_nama: toStr(r.guru_nama),
            updated_at: toStr(r.updated_at),
          };
        })
      : currentDb.asesmenHasilKarya,
    asesmenCeklis: tablesByTitle.Asesmen_Ceklis
      ? rowsToObjects(tablesByTitle.Asesmen_Ceklis).map(
          (r): AsesmenCeklis => ({
            ceklis_id: toStr(r.ceklis_id),
            tanggal: toStr(r.tanggal),
            periode_bulan: toStr(r.periode_bulan),
            semester: (toStr(r.semester) as SemesterType) || 'Semester 1',
            ta_id: toStr(r.ta_id),
            siswa_id: toStr(r.siswa_id),
            nama_anak: toStr(r.nama_anak),
            kelas: toStr(r.kelas),
            elemen: toStr(r.elemen) as AsesmenCeklis['elemen'],
            kode_atp: toStr(r.kode_atp),
            tujuan_pembelajaran: toStr(r.tujuan_pembelajaran),
            konteks: toStr(r.konteks),
            status_muncul: toStr(r.status_muncul) === 'Sudah Muncul' ? 'Sudah Muncul' : 'Belum Muncul',
            kejadian_teramati: toStr(r.kejadian_teramati),
            guru_nama: toStr(r.guru_nama),
            updated_at: toStr(r.updated_at),
          })
        )
      : currentDb.asesmenCeklis,
    masterMateri: tablesByTitle.Master_Materi
      ? rowsToObjects(tablesByTitle.Master_Materi).map(
          (r): MasterMateri => ({
            materi_id: toStr(r.materi_id),
            kategori: toStr(r.kategori) as MasterMateri['kategori'],
            nama_materi: toStr(r.nama_materi),
            urutan: toNum(r.urutan, 1),
            aktif: toBool(r.aktif, true),
          })
        )
      : currentDb.masterMateri,
    masterTips: tablesByTitle.Master_Tips
      ? rowsToObjects(tablesByTitle.Master_Tips).map(
          (r): MasterTips => ({
            tips_id: toStr(r.tips_id),
            kategori_pemicu: toStr(r.kategori_pemicu) as MasterTips['kategori_pemicu'],
            kondisi_pemicu: toStr(r.kondisi_pemicu),
            judul_tips: toStr(r.judul_tips),
            isi_tips_ayah_bunda: toStr(r.isi_tips_ayah_bunda),
            aktif: toBool(r.aktif, true),
          })
        )
      : currentDb.masterTips,
    bankMateriHarian: tablesByTitle.Bank_Materi_Harian
      ? rowsToObjects(tablesByTitle.Bank_Materi_Harian).map(
          (r): BankMateriHarian => ({
            kode_item: toStr(r.kode_item),
            bidang: toStr(r.bidang) as BankMateriHarian['bidang'],
            level_track: toStr(r.level_track),
            kategori: toStr(r.kategori) as BankMateriHarian['kategori'],
            label_kelompok: toStr(r.label_kelompok),
            isi_item: toStr(r.isi_item),
            pertanyaan_cek: toStr(r.pertanyaan_cek),
            aktif: toBool(r.aktif, true),
          })
        )
      : currentDb.bankMateriHarian,
    masterAtp: tablesByTitle.Master_ATP
      ? rowsToObjects(tablesByTitle.Master_ATP).map(
          (r): MasterAtp => ({
            atp_uid: toStr(r.atp_uid),
            kelompok: toStr(r.kelompok) === 'Kelompok B' ? 'Kelompok B' : 'Kelompok A',
            semester_target: toStr(r.semester_target) as MasterAtp['semester_target'],
            elemen: toStr(r.elemen) as MasterAtp['elemen'],
            kode_atp: toStr(r.kode_atp),
            tujuan_pembelajaran: toStr(r.tujuan_pembelajaran),
            aktif: toBool(r.aktif, true),
          })
        )
      : currentDb.masterAtp,
    masterKelas: tablesByTitle.Master_Kelas
      ? rowsToObjects(tablesByTitle.Master_Kelas).map(
          (r): MasterKelas => ({
            kelas_id: toStr(r.kelas_id),
            nama_kelas: toStr(r.nama_kelas),
            jenjang: toStr(r.jenjang) === 'B' ? 'B' : 'A',
            urutan: toNum(r.urutan, 1),
            aktif: toBool(r.aktif, true),
          })
        )
      : currentDb.masterKelas,
  };
}

const verifiedTabsCache = new Map<string, SpreadsheetMeta>();

async function fetchSheetsWithRetry(url: string, init: RequestInit, retries = 2): Promise<Response> {
  let attempt = 0;
  while (true) {
    const res = await fetch(url, init);
    if ((res.status === 429 || res.status === 503) && attempt < retries) {
      attempt += 1;
      await new Promise((r) => setTimeout(r, 700 * attempt));
      continue;
    }
    return res;
  }
}

export async function listUserSpreadsheets(accessToken: string): Promise<DriveSpreadsheetFile[]> {
  const q = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&orderBy=modifiedTime desc&pageSize=20&fields=files(id,name,webViewLink,modifiedTime)`;
  const res = await fetchSheetsWithRetry(url, {
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
  rawSpreadsheetId: string
): Promise<SpreadsheetMeta> {
  const spreadsheetId = extractSpreadsheetId(rawSpreadsheetId);
  if (!spreadsheetId) {
    throw new Error('ID atau tautan Google Spreadsheet belum diisi.');
  }
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}?fields=spreadsheetId,spreadsheetUrl,properties.title,sheets.properties.title`;
  const res = await fetchSheetsWithRetry(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error?.message || 'Spreadsheet tidak ditemukan atau akses ditolak.');
  }
  const meta: SpreadsheetMeta = {
    spreadsheetId: json.spreadsheetId,
    title: json.properties?.title || 'Spreadsheet Sekolah',
    spreadsheetUrl:
      json.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${json.spreadsheetId}/edit`,
    sheetNames: (json.sheets || [])
      .map((s: { properties?: { title?: string } }) => s.properties?.title || '')
      .filter(Boolean),
  };
  verifiedTabsCache.set(meta.spreadsheetId, meta);
  return meta;
}

export async function createSchoolSpreadsheet(
  accessToken: string,
  title: string,
  db: SchoolDatabase
): Promise<SpreadsheetMeta> {
  const tables = buildSchoolSheetTables(db);
  const createRes = await fetchSheetsWithRetry('https://sheets.googleapis.com/v4/spreadsheets', {
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
  verifiedTabsCache.set(spreadsheetId, meta);

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

  const batchRes = await fetchSheetsWithRetry(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'RAW',
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
  rawSpreadsheetId: string,
  db: SchoolDatabase
): Promise<{ meta: SpreadsheetMeta; tabsUpdated: number }> {
  const spreadsheetId = extractSpreadsheetId(rawSpreadsheetId);
  if (!spreadsheetId) {
    throw new Error('ID Google Spreadsheet belum diisi.');
  }

  const tables = buildSchoolSheetTables(db);
  const requiredTitles = tables.map((t) => t.title);

  const cachedMeta = verifiedTabsCache.get(spreadsheetId);
  const hasAllCachedTabs =
    cachedMeta && requiredTitles.every((title) => cachedMeta.sheetNames.includes(title));

  let meta = hasAllCachedTabs
    ? cachedMeta!
    : await fetchSpreadsheetMeta(accessToken, spreadsheetId);

  const ensureAllTabsAndSync = async (currentMeta: SpreadsheetMeta): Promise<SpreadsheetMeta> => {
    const missingTitles = requiredTitles.filter((title) => !currentMeta.sheetNames.includes(title));
    if (missingTitles.length > 0) {
      const addRes = await fetchSheetsWithRetry(
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
      currentMeta = {
        ...currentMeta,
        sheetNames: [...currentMeta.sheetNames, ...missingTitles],
      };
      verifiedTabsCache.set(spreadsheetId, currentMeta);
    }

    const clearRes = await fetchSheetsWithRetry(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values:batchClear`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ranges: tables.map((t) => `'${t.title}'`),
        }),
      }
    );
    if (!clearRes.ok) {
      const errJson = await clearRes.json().catch(() => ({}));
      throw new Error(errJson?.error?.message || 'Gagal membersihkan rentang sheet lama.');
    }

    await writeTablesToSpreadsheet(accessToken, spreadsheetId, tables);
    return currentMeta;
  };

  try {
    meta = await ensureAllTabsAndSync(meta);
  } catch (err) {
    // If cached tab list became stale (e.g., user deleted a tab manually), refresh metadata and retry once
    if (hasAllCachedTabs) {
      verifiedTabsCache.delete(spreadsheetId);
      const freshMeta = await fetchSpreadsheetMeta(accessToken, spreadsheetId);
      meta = await ensureAllTabsAndSync(freshMeta);
    } else {
      throw err;
    }
  }

  return { meta, tabsUpdated: tables.length };
}

export async function pullSchoolDatabaseFromSpreadsheet(
  accessToken: string,
  rawSpreadsheetId: string,
  currentDb: SchoolDatabase
): Promise<{ meta: SpreadsheetMeta; db: SchoolDatabase }> {
  const spreadsheetId = extractSpreadsheetId(rawSpreadsheetId);
  const meta = await fetchSpreadsheetMeta(accessToken, spreadsheetId);
  const tables = buildSchoolSheetTables(currentDb);
  const existingTitles = tables
    .map((t) => t.title)
    .filter((title) => meta.sheetNames.includes(title));

  if (existingTitles.length === 0) {
    throw new Error('Spreadsheet ini belum memiliki tab data sekolah.');
  }

  const rangesQuery = existingTitles
    .map((t) => `ranges=${encodeURIComponent(`'${t}'`)}`)
    .join('&');
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values:batchGet?${rangesQuery}`;
  const res = await fetchSheetsWithRetry(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error?.message || 'Gagal membaca data dari Google Sheets.');
  }

  const valueRanges = (json.valueRanges || []) as { range?: string; values?: unknown[][] }[];
  const tablesMap: Record<string, unknown[][]> = {};
  existingTitles.forEach((title, idx) => {
    const vr = valueRanges[idx];
    if (vr?.values) {
      tablesMap[title] = vr.values;
    }
  });

  const parsedDb = parsePulledSheetTables(tablesMap, currentDb);
  return { meta, db: parsedDb };
}
