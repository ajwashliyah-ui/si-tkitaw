import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkHasilKaryaMonthlyQuota,
  computeAttendanceRekap,
  getSemesterFromMonth,
  processKenaikanKelasOtomatis,
} from './attendance';
import { createInitialSeedDatabase } from '../data/seedDatabase';

test('getSemesterFromMonth maps Jul-Dec to Semester 1 and Jan-Jun to Semester 2', () => {
  assert.equal(getSemesterFromMonth(7), 'Semester 1');
  assert.equal(getSemesterFromMonth(11), 'Semester 1');
  assert.equal(getSemesterFromMonth(1), 'Semester 2');
  assert.equal(getSemesterFromMonth(6), 'Semester 2');
});

test('computeAttendanceRekap totals H/S/I/A and percentage accurately', () => {
  const db = createInitialSeedDatabase();
  const rekap = computeAttendanceRekap(db.siswa, db.daftarHadir, {
    mode: 'bulanan',
    periodeBulan: '2026-11',
    kelasFilter: 'Kelas A',
  });
  assert.equal(rekap.length, 2);
  const ali = rekap.find((r) => r.siswa_id === 'SIS-001')!;
  assert.equal(ali.hadir, 2);
  assert.equal(ali.sakit, 0);
  assert.equal(ali.persenKehadiran, 100);

  const khansa = rekap.find((r) => r.siswa_id === 'SIS-004')!;
  assert.equal(khansa.hadir, 1);
  assert.equal(khansa.sakit, 1);
  assert.equal(khansa.persenKehadiran, 50);
});

test('checkHasilKaryaMonthlyQuota enforces max 3 photos per child per month', () => {
  const dummyList = [1, 2, 3].map((i) => ({
    karya_id: `K-${i}`,
    tanggal: `2026-11-0${i}`,
    periode_bulan: '2026-11',
    semester: 'Semester 1' as const,
    ta_id: 'TA-2026-2027',
    siswa_id: 'SIS-001',
    nama_anak: 'Ali',
    kelas: 'Kelas A' as const,
    foto_drive_id: '',
    foto_url: '',
    deskripsi_karya: '',
    analisis_nabp: '',
    analisis_jd: '',
    analisis_lmstrs: '',
    guru_nama: 'Guru',
    updated_at: '',
  }));
  const quota = checkHasilKaryaMonthlyQuota(dummyList, 'SIS-001', '2026-11');
  assert.equal(quota.count, 3);
  assert.equal(quota.remaining, 0);
  assert.equal(quota.isFull, true);
});

test('processKenaikanKelasOtomatis promotes Kelas A to Kelas B and graduates Kelas B', () => {
  const db = createInitialSeedDatabase();
  const result = processKenaikanKelasOtomatis({
    siswaList: db.siswa,
    riwayatList: db.riwayatKelas,
    currentTaId: 'TA-2026-2027',
    newTaId: 'TA-2027-2028',
    waliKelasAId: 'USR-GRU-A1',
    waliKelasBId: 'USR-GRU-B1',
  });
  assert.equal(result.promotedToBCount, 2);
  assert.equal(result.graduatedCount, 2);
  const ali = result.updatedSiswa.find((s) => s.siswa_id === 'SIS-001')!;
  const zahra = result.updatedSiswa.find((s) => s.siswa_id === 'SIS-002')!;
  assert.equal(ali.kelas_aktif, 'Kelas B');
  assert.equal(zahra.kelas_aktif, 'Lulus');
  assert.equal(zahra.status_siswa, 'Lulus');
});
