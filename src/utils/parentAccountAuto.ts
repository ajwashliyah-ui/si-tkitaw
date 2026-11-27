import { JenisKelamin, KelasType, RiwayatKelas, Siswa, TrackKelasB, User } from '../types';

export interface AutoParentCredentials {
  user_id: string;
  username: string;
  password: string;
  nama_lengkap: string;
  no_hp: string;
  nama_anak: string;
  nis: string;
}

export interface CreateStudentWithAutoParentInput {
  nis: string;
  nama_anak: string;
  jenis_kelamin: JenisKelamin;
  tanggal_lahir: string;
  kelas_aktif: KelasType;
  target_literasi_kelas_b: TrackKelasB;
  existingUsers: User[];
  activeTa?: { ta_id: string; nama_ta: string };
  waliKelasId?: string;
  autoCreateParent: boolean;
  existingOrtuUserId?: string;
  parentName?: string;
  parentUsername?: string;
  parentPassword?: string;
  parentNoHp?: string;
  nowMs?: number;
}

export interface CreateStudentWithAutoParentResult {
  siswa: Siswa;
  riwayat: RiwayatKelas | null;
  newParentUser: User | null;
  credentials: AutoParentCredentials | null;
}

function slugifyToken(raw: string): string {
  return String(raw || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

export function buildAutoParentUsername(
  namaAnak: string,
  nis: string,
  existingUsernames: Iterable<string>
): string {
  const taken = new Set<string>();
  for (const u of existingUsernames) {
    const clean = String(u || '').trim().toLowerCase();
    if (clean) taken.add(clean);
  }

  const cleanNis = slugifyToken(nis);
  const firstWord = slugifyToken(String(namaAnak || '').trim().split(/\s+/)[0] || '');

  let base = 'ortu';
  if (firstWord && cleanNis) {
    base = `ortu_${firstWord.slice(0, 10)}_${cleanNis.slice(-8)}`;
  } else if (cleanNis) {
    base = `ortu_${cleanNis.slice(0, 20)}`;
  } else if (firstWord) {
    base = `ortu_${firstWord.slice(0, 20)}`;
  } else {
    base = `ortu_${Date.now().toString().slice(-6)}`;
  }

  base = base.replace(/[^a-z0-9._-]/g, '').slice(0, 28);
  if (base.length < 3) {
    base = `ortu_${Date.now().toString().slice(-5)}`;
  }

  if (!taken.has(base)) return base;

  let counter = 2;
  while (counter < 1000) {
    const suffix = `_${counter}`;
    const candidate = `${base.slice(0, 32 - suffix.length)}${suffix}`;
    if (!taken.has(candidate)) return candidate;
    counter += 1;
  }

  return `ortu_${Date.now().toString().slice(-8)}`;
}

export function buildAutoParentDisplayName(parentNameInput: string | undefined, namaAnak: string): string {
  const trimmed = String(parentNameInput || '').trim();
  if (trimmed.length >= 2) return trimmed.slice(0, 80);
  const child = String(namaAnak || '').trim() || 'Murid';
  return `Wali ${child}`.slice(0, 80);
}

export function createStudentWithOptionalAutoParent(
  input: CreateStudentWithAutoParentInput
): CreateStudentWithAutoParentResult {
  const now = input.nowMs ?? Date.now();
  const cleanNis = input.nis.trim();
  const cleanChildName = input.nama_anak.trim();
  const siswaId = `SIS-${now.toString().slice(-5)}-${Math.floor(Math.random() * 90 + 10)}`;

  let newParentUser: User | null = null;
  let credentials: AutoParentCredentials | null = null;
  let resolvedOrtuId = input.existingOrtuUserId || '';

  if (input.autoCreateParent) {
    const existingUsernames = input.existingUsers.map((u) => u.username.toLowerCase());
    const rawRequested = String(input.parentUsername || '').trim().toLowerCase();
    const validRequested = /^[a-z0-9._-]{3,32}$/.test(rawRequested) && !existingUsernames.includes(rawRequested);
    const username = validRequested
      ? rawRequested
      : buildAutoParentUsername(cleanChildName, cleanNis, existingUsernames);

    const password =
      input.parentPassword && input.parentPassword.length >= 6 ? input.parentPassword : '123456';
    const displayName = buildAutoParentDisplayName(input.parentName, cleanChildName);
    const noHp = String(input.parentNoHp || '').trim();
    const userId = `USR-ORT-${now.toString().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;

    newParentUser = {
      user_id: userId,
      username,
      password,
      password_hash: '',
      role: 'OrangTua',
      nama_lengkap: displayName,
      no_hp: noHp,
      kelas_ampu: '',
      status_aktif: true,
    };
    resolvedOrtuId = userId;
    credentials = {
      user_id: userId,
      username,
      password,
      nama_lengkap: displayName,
      no_hp: noHp,
      nama_anak: cleanChildName,
      nis: cleanNis,
    };
  }

  const siswa: Siswa = {
    siswa_id: siswaId,
    nis: cleanNis,
    nama_anak: cleanChildName,
    jenis_kelamin: input.jenis_kelamin,
    tanggal_lahir: input.tanggal_lahir,
    ortu_user_id: resolvedOrtuId,
    kelas_aktif: input.kelas_aktif,
    status_siswa: 'Aktif',
    target_literasi_kelas_b: input.target_literasi_kelas_b,
    keputusan_kenaikan: 'BELUM_DITENTUKAN',
  };

  const riwayat: RiwayatKelas | null = input.activeTa
    ? {
        riwayat_id: `RWY-${now}-${Math.floor(Math.random() * 90 + 10)}`,
        siswa_id: siswaId,
        ta_id: input.activeTa.ta_id,
        nama_ta: input.activeTa.nama_ta,
        kelas: input.kelas_aktif,
        wali_kelas_id: input.waliKelasId || '',
        status_akhir: 'Berjalan',
      }
    : null;

  return {
    siswa,
    riwayat,
    newParentUser,
    credentials,
  };
}
