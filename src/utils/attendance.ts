import {
  AsesmenHasilKarya,
  DaftarHadirRecord,
  KelasType,
  RiwayatKelas,
  SemesterType,
  Siswa,
} from '../types';

export interface AttendanceRekapRow {
  no: number;
  siswa_id: string;
  nis: string;
  nama_anak: string;
  kelas: string;
  hadir: number;
  sakit: number;
  izin: number;
  alpa: number;
  totalHariEfektif: number;
  persenKehadiran: number;
}

export function getSemesterFromMonth(month: number): SemesterType {
  // Semester 1: Juli (7) - Desember (12), Semester 2: Januari (1) - Juni (6)
  return month >= 7 ? 'Semester 1' : 'Semester 2';
}

export function computeAttendanceRekap(
  students: Siswa[],
  logs: DaftarHadirRecord[],
  options: {
    mode: 'bulanan' | 'semester';
    periodeBulan?: string; // YYYY-MM
    semester?: SemesterType;
    taId?: string;
    kelasFilter?: 'Semua Kelas' | KelasType;
  }
): AttendanceRekapRow[] {
  const activeStudents = students.filter((s) => {
    if (s.status_siswa !== 'Aktif') return false;
    if (options.kelasFilter && options.kelasFilter !== 'Semua Kelas') {
      return s.kelas_aktif === options.kelasFilter;
    }
    return true;
  });

  const matchingLogs = logs.filter((l) => {
    if (options.mode === 'bulanan') {
      return l.periode_bulan === options.periodeBulan;
    }
    const taMatch = options.taId ? l.ta_id === options.taId : true;
    const semMatch = options.semester ? l.semester === options.semester : true;
    return taMatch && semMatch;
  });

  return activeStudents.map((student, idx) => {
    const sLogs = matchingLogs.filter((l) => l.siswa_id === student.siswa_id);
    const hadir = sLogs.filter((l) => l.status === 'HADIR').length;
    const sakit = sLogs.filter((l) => l.status === 'SAKIT').length;
    const izin = sLogs.filter((l) => l.status === 'IZIN').length;
    const alpa = sLogs.filter((l) => l.status === 'ALPA').length;
    const totalHariEfektif = hadir + sakit + izin + alpa;
    const persenKehadiran =
      totalHariEfektif > 0 ? Math.round((hadir / totalHariEfektif) * 100) : 0;

    return {
      no: idx + 1,
      siswa_id: student.siswa_id,
      nis: student.nis,
      nama_anak: student.nama_anak,
      kelas: student.kelas_aktif,
      hadir,
      sakit,
      izin,
      alpa,
      totalHariEfektif,
      persenKehadiran,
    };
  });
}

export const MAX_HASIL_KARYA_PER_MONTH = 3;

export function checkHasilKaryaMonthlyQuota(
  karyaList: AsesmenHasilKarya[],
  siswaId: string,
  periodeBulan: string
): {
  count: number;
  remaining: number;
  isFull: boolean;
} {
  const count = karyaList.filter(
    (k) => k.siswa_id === siswaId && k.periode_bulan === periodeBulan
  ).length;
  const remaining = Math.max(0, MAX_HASIL_KARYA_PER_MONTH - count);
  return {
    count,
    remaining,
    isFull: count >= MAX_HASIL_KARYA_PER_MONTH,
  };
}

export function processKenaikanKelasOtomatis(params: {
  siswaList: Siswa[];
  riwayatList: RiwayatKelas[];
  currentTaId: string;
  newTaId: string;
  waliKelasAId: string;
  waliKelasBId: string;
}): {
  updatedSiswa: Siswa[];
  updatedRiwayat: RiwayatKelas[];
  promotedToBCount: number;
  graduatedCount: number;
} {
  const { siswaList, riwayatList, currentTaId, newTaId, waliKelasAId, waliKelasBId } = params;

  let promotedToBCount = 0;
  let graduatedCount = 0;

  const updatedRiwayat: RiwayatKelas[] = riwayatList.map((r) => {
    if (r.ta_id !== currentTaId || r.status_akhir !== 'Berjalan') return r;
    const student = siswaList.find((s) => s.siswa_id === r.siswa_id);
    if (!student || student.status_siswa !== 'Aktif') return r;
    if (r.kelas === 'Kelas A') {
      return { ...r, status_akhir: 'Naik Kelas' };
    }
    if (r.kelas === 'Kelas B') {
      return { ...r, status_akhir: 'Lulus' };
    }
    return r;
  });

  const updatedSiswa: Siswa[] = siswaList.map((s) => {
    if (s.status_siswa !== 'Aktif') return s;
    if (s.kelas_aktif === 'Kelas A') {
      promotedToBCount += 1;
      updatedRiwayat.push({
        riwayat_id: `RWY-${newTaId}-${s.siswa_id}`,
        siswa_id: s.siswa_id,
        ta_id: newTaId,
        nama_ta: newTaId.replace('TA-', '').replace('-', '/'),
        kelas: 'Kelas B',
        wali_kelas_id: waliKelasBId,
        status_akhir: 'Berjalan',
      });
      return {
        ...s,
        kelas_aktif: 'Kelas B',
      };
    }
    if (s.kelas_aktif === 'Kelas B') {
      graduatedCount += 1;
      return {
        ...s,
        kelas_aktif: 'Lulus',
        status_siswa: 'Lulus',
      };
    }
    return s;
  });

  return {
    updatedSiswa,
    updatedRiwayat,
    promotedToBCount,
    graduatedCount,
  };
}
