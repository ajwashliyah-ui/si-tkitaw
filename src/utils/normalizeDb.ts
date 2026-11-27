import { createInitialSeedDatabase } from '../data/seedDatabase';
import { MasterKelas, SchoolDatabase, Siswa, User } from '../types';

export function normalizeUsernameStr(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .replace(/^@+/, '')
    .toLowerCase();
}

export function normalizeDateYmd(raw: unknown): string {
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return raw.toISOString().slice(0, 10);
  }
  const s = String(raw ?? '').trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return s.slice(0, 10);
  }
  return s;
}

export function normalizePeriodeMonth(raw: unknown): string {
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return raw.toISOString().slice(0, 7);
  }
  const s = String(raw ?? '').trim();
  if (/^\d{4}-\d{2}/.test(s)) {
    return s.slice(0, 7);
  }
  return s;
}

export function normalizeBooleanFlag(raw: unknown, defaultValue = true): boolean {
  if (typeof raw === 'boolean') return raw;
  if (raw === undefined || raw === null || raw === '') return defaultValue;
  const s = String(raw).trim().toLowerCase();
  if (s === 'false' || s === '0' || s === 'no' || s === 'tidak') return false;
  if (s === 'true' || s === '1' || s === 'yes' || s === 'ya') return true;
  return defaultValue;
}

export function isUserActive(u: Pick<User, 'status_aktif'>): boolean {
  return normalizeBooleanFlag(u.status_aktif, true);
}

export function isAdminClaimedDb(db: Partial<SchoolDatabase> | null | undefined): boolean {
  if (!db) return false;
  if (normalizeBooleanFlag(db.pengaturanSekolah?.admin_claimed, false)) return true;
  return Array.isArray(db.users)
    ? db.users.some((u) => u?.role === 'Admin' && isUserActive(u))
    : false;
}

function defaultMasterKelas(): MasterKelas[] {
  return [
    { kelas_id: 'KLS-A', nama_kelas: 'Kelas A', jenjang: 'A', urutan: 1, aktif: true },
    { kelas_id: 'KLS-B', nama_kelas: 'Kelas B', jenjang: 'B', urutan: 2, aktif: true },
  ];
}

export function normalizeSchoolDatabase(rawInput: Partial<SchoolDatabase> | null | undefined): SchoolDatabase {
  const seed = createInitialSeedDatabase();
  const raw = rawInput || {};
  const rawCfg = (raw.pengaturanSekolah || {}) as Partial<SchoolDatabase['pengaturanSekolah']>;

  const users: User[] = Array.isArray(raw.users)
    ? raw.users.map((u) => ({
        ...u,
        user_id: String(u.user_id ?? '').trim(),
        username: normalizeUsernameStr(u.username),
        password_hash: String(u.password_hash ?? ''),
        ...(typeof u.password === 'string' ? { password: u.password } : {}),
        role: u.role === 'Admin' ? 'Admin' : u.role === 'Guru' ? 'Guru' : 'OrangTua',
        nama_lengkap: String(u.nama_lengkap ?? '').trim(),
        no_hp: String(u.no_hp ?? '').trim(),
        kelas_ampu: String(u.kelas_ampu ?? '').trim(),
        status_aktif: normalizeBooleanFlag(u.status_aktif, true),
      }))
    : seed.users;

  const siswa: Siswa[] = Array.isArray(raw.siswa)
    ? raw.siswa.map((s) => ({
        ...s,
        siswa_id: String(s.siswa_id ?? '').trim(),
        nis: String(s.nis ?? '').trim(),
        nama_anak: String(s.nama_anak ?? '').trim(),
        jenis_kelamin: s.jenis_kelamin === 'P' ? 'P' : 'L',
        tanggal_lahir: normalizeDateYmd(s.tanggal_lahir),
        ortu_user_id: String(s.ortu_user_id ?? '').trim(),
        kelas_aktif: String(s.kelas_aktif ?? 'Kelas A').trim() || 'Kelas A',
        status_siswa:
          s.status_siswa === 'Lulus'
            ? 'Lulus'
            : s.status_siswa === 'Pindah'
            ? 'Pindah'
            : 'Aktif',
        target_literasi_kelas_b: s.target_literasi_kelas_b || 'TRACK_1',
        target_kustom_kelas_b: String(s.target_kustom_kelas_b ?? ''),
        keputusan_kenaikan: s.keputusan_kenaikan || 'BELUM_DITENTUKAN',
        catatan_kenaikan: String(s.catatan_kenaikan ?? ''),
        keputusan_diatur_oleh: String(s.keputusan_diatur_oleh ?? ''),
      }))
    : seed.siswa;

  const masterKelas: MasterKelas[] =
    Array.isArray(raw.masterKelas) && raw.masterKelas.length > 0
      ? raw.masterKelas.map((k, idx) => ({
          kelas_id: String(k.kelas_id ?? `KLS-${idx + 1}`).trim(),
          nama_kelas: String(k.nama_kelas ?? '').trim(),
          jenjang: k.jenjang === 'B' ? 'B' : 'A',
          urutan: Number(k.urutan) || idx + 1,
          aktif: normalizeBooleanFlag(k.aktif, true),
        }))
      : seed.masterKelas && seed.masterKelas.length > 0
      ? seed.masterKelas
      : defaultMasterKelas();

  const adminClaimed =
    normalizeBooleanFlag(rawCfg.admin_claimed, false) ||
    users.some((u) => u.role === 'Admin' && isUserActive(u));

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
      semester_aktif: rawCfg.semester_aktif === 'Semester 2' ? 'Semester 2' : 'Semester 1',
      folder_drive_id: String(rawCfg.folder_drive_id ?? '').trim(),
      gas_webapp_url: String(rawCfg.gas_webapp_url ?? '').trim(),
      gas_sync_key: String(rawCfg.gas_sync_key ?? seed.pengaturanSekolah.gas_sync_key ?? '').trim(),
      google_spreadsheet_id: String(rawCfg.google_spreadsheet_id ?? '').trim(),
      google_spreadsheet_url: String(rawCfg.google_spreadsheet_url ?? '').trim(),
      auto_sync_sheets: normalizeBooleanFlag(rawCfg.auto_sync_sheets, true),
      admin_claimed: adminClaimed,
    },
    users,
    tahunAjaran: Array.isArray(raw.tahunAjaran)
      ? raw.tahunAjaran.map((t) => ({
          ...t,
          ta_id: String(t.ta_id ?? '').trim(),
          nama_ta: String(t.nama_ta ?? '').trim(),
          tanggal_mulai: normalizeDateYmd(t.tanggal_mulai),
          tanggal_selesai: normalizeDateYmd(t.tanggal_selesai),
          status_aktif: normalizeBooleanFlag(t.status_aktif, false),
        }))
      : seed.tahunAjaran,
    siswa,
    riwayatKelas: Array.isArray(raw.riwayatKelas)
      ? raw.riwayatKelas.map((r) => ({
          ...r,
          riwayat_id: String(r.riwayat_id ?? '').trim(),
          siswa_id: String(r.siswa_id ?? '').trim(),
          ta_id: String(r.ta_id ?? '').trim(),
          nama_ta: String(r.nama_ta ?? '').trim(),
          kelas: String(r.kelas ?? '').trim(),
          wali_kelas_id: String(r.wali_kelas_id ?? '').trim(),
          catatan: String(r.catatan ?? ''),
        }))
      : seed.riwayatKelas,
    antropometri: Array.isArray(raw.antropometri)
      ? raw.antropometri.map((a) => ({
          ...a,
          siswa_id: String(a.siswa_id ?? '').trim(),
          periode_bulan: normalizePeriodeMonth(a.periode_bulan),
        }))
      : seed.antropometri,
    literasi: Array.isArray(raw.literasi)
      ? raw.literasi.map((l) => ({
          ...l,
          siswa_id: String(l.siswa_id ?? '').trim(),
          periode_bulan: normalizePeriodeMonth(l.periode_bulan),
        }))
      : seed.literasi,
    keagamaan: Array.isArray(raw.keagamaan)
      ? raw.keagamaan.map((k) => ({
          ...k,
          siswa_id: String(k.siswa_id ?? '').trim(),
          periode_bulan: normalizePeriodeMonth(k.periode_bulan),
        }))
      : seed.keagamaan,
    kaihHarian: Array.isArray(raw.kaihHarian)
      ? raw.kaihHarian.map((k) => ({
          ...k,
          siswa_id: String(k.siswa_id ?? '').trim(),
          tanggal: normalizeDateYmd(k.tanggal),
          periode_bulan: normalizePeriodeMonth(k.periode_bulan),
        }))
      : seed.kaihHarian,
    kaihFotoBulanan: Array.isArray(raw.kaihFotoBulanan)
      ? raw.kaihFotoBulanan.map((f) => ({
          ...f,
          siswa_id: String(f.siswa_id ?? '').trim(),
          periode_bulan: normalizePeriodeMonth(f.periode_bulan),
        }))
      : seed.kaihFotoBulanan,
    ulasanOrtu: Array.isArray(raw.ulasanOrtu)
      ? raw.ulasanOrtu.map((u) => ({
          ...u,
          siswa_id: String(u.siswa_id ?? '').trim(),
          periode_bulan: normalizePeriodeMonth(u.periode_bulan),
        }))
      : seed.ulasanOrtu,
    masterMateri:
      Array.isArray(raw.masterMateri) && raw.masterMateri.length > 0
        ? raw.masterMateri.map((m) => ({
            ...m,
            urutan: Number(m.urutan) || 1,
            aktif: normalizeBooleanFlag(m.aktif, true),
          }))
        : seed.masterMateri,
    masterTips:
      Array.isArray(raw.masterTips) && raw.masterTips.length > 0
        ? raw.masterTips.map((t) => ({
            ...t,
            aktif: normalizeBooleanFlag(t.aktif, true),
          }))
        : seed.masterTips,
    bankMateriHarian:
      Array.isArray(raw.bankMateriHarian) && raw.bankMateriHarian.length > 0
        ? raw.bankMateriHarian.map((b) => ({
            ...b,
            aktif: normalizeBooleanFlag(b.aktif, true),
          }))
        : seed.bankMateriHarian,
    logMateriHarian: Array.isArray(raw.logMateriHarian)
      ? raw.logMateriHarian.map((l) => ({
          ...l,
          id_siswa: String(l.id_siswa ?? '').trim(),
          tanggal: normalizeDateYmd(l.tanggal),
          halaman_iqra: String(l.halaman_iqra ?? ''),
        }))
      : seed.logMateriHarian,
    daftarHadir: Array.isArray(raw.daftarHadir)
      ? raw.daftarHadir.map((d) => ({
          ...d,
          siswa_id: String(d.siswa_id ?? '').trim(),
          tanggal: normalizeDateYmd(d.tanggal),
          periode_bulan: normalizePeriodeMonth(d.periode_bulan),
        }))
      : seed.daftarHadir,
    asesmenAnekdot: Array.isArray(raw.asesmenAnekdot)
      ? raw.asesmenAnekdot.map((a) => ({
          ...a,
          siswa_id: String(a.siswa_id ?? '').trim(),
          tanggal: normalizeDateYmd(a.tanggal),
          periode_bulan: normalizePeriodeMonth(a.periode_bulan),
        }))
      : seed.asesmenAnekdot,
    asesmenHasilKarya: Array.isArray(raw.asesmenHasilKarya)
      ? raw.asesmenHasilKarya.map((k) => ({
          ...k,
          siswa_id: String(k.siswa_id ?? '').trim(),
          tanggal: normalizeDateYmd(k.tanggal),
          periode_bulan: normalizePeriodeMonth(k.periode_bulan),
        }))
      : seed.asesmenHasilKarya,
    asesmenCeklis: Array.isArray(raw.asesmenCeklis)
      ? raw.asesmenCeklis.map((c) => ({
          ...c,
          siswa_id: String(c.siswa_id ?? '').trim(),
          tanggal: normalizeDateYmd(c.tanggal),
          periode_bulan: normalizePeriodeMonth(c.periode_bulan),
        }))
      : seed.asesmenCeklis,
    masterAtp:
      Array.isArray(raw.masterAtp) && raw.masterAtp.length > 0
        ? raw.masterAtp.map((a) => ({
            ...a,
            aktif: normalizeBooleanFlag(a.aktif, true),
          }))
        : seed.masterAtp,
    masterKelas,
  };
}

export interface MergePulledGasOptions {
  gasUrl: string;
  syncKey: string;
  forceRemote?: boolean;
}

export interface MergePulledGasResult {
  db: SchoolDatabase;
  adoptedRemote: boolean;
  shouldBootstrapRemote: boolean;
}

/**
 * Merges a remote Google Sheets snapshot with local state without ever wiping
 * a claimed local Admin/database with an uninitialized remote seed spreadsheet.
 */
export function mergePulledGasDatabase(
  currentRaw: SchoolDatabase,
  pulledRaw: Partial<SchoolDatabase>,
  options: MergePulledGasOptions
): MergePulledGasResult {
  const current = normalizeSchoolDatabase(currentRaw);
  const pulled = normalizeSchoolDatabase(pulledRaw);

  const localClaimed = isAdminClaimedDb(current);
  const remoteClaimed = isAdminClaimedDb(pulled);

  // If the remote Sheet has NOT claimed an Admin yet while local already has a claimed Admin
  // (or local holds substantially more student records), preserve local state and signal bootstrap.
  if (
    !options.forceRemote &&
    !remoteClaimed &&
    (localClaimed || current.siswa.length > pulled.siswa.length)
  ) {
    return {
      db: {
        ...current,
        pengaturanSekolah: {
          ...current.pengaturanSekolah,
          gas_webapp_url: options.gasUrl || current.pengaturanSekolah.gas_webapp_url,
          gas_sync_key: options.syncKey || current.pengaturanSekolah.gas_sync_key,
          admin_claimed: localClaimed,
        },
      },
      adoptedRemote: false,
      shouldBootstrapRemote: true,
    };
  }

  const existingById = new Map(current.users.map((u) => [u.user_id, u]));
  const existingByName = new Map(current.users.map((u) => [normalizeUsernameStr(u.username), u]));

  const mergedUsers: User[] = pulled.users.map((u) => {
    const prev = existingById.get(u.user_id) || existingByName.get(normalizeUsernameStr(u.username));
    return {
      ...u,
      password_hash: u.password_hash || prev?.password_hash || '',
    };
  });

  // Ensure an already-claimed local Admin isn't dropped if Sheets row sync lagged
  if (localClaimed && !mergedUsers.some((u) => u.role === 'Admin' && isUserActive(u))) {
    for (const adm of current.users) {
      if (adm.role === 'Admin' && isUserActive(adm)) {
        mergedUsers.unshift(adm);
      }
    }
  }

  const merged: SchoolDatabase = {
    ...current,
    ...pulled,
    users: mergedUsers,
    pengaturanSekolah: {
      ...current.pengaturanSekolah,
      ...pulled.pengaturanSekolah,
      gas_webapp_url: options.gasUrl || current.pengaturanSekolah.gas_webapp_url,
      gas_sync_key: options.syncKey || current.pengaturanSekolah.gas_sync_key,
      admin_claimed:
        localClaimed ||
        remoteClaimed ||
        mergedUsers.some((u) => u.role === 'Admin' && isUserActive(u)),
    },
  };

  return {
    db: merged,
    adoptedRemote: true,
    shouldBootstrapRemote: false,
  };
}
