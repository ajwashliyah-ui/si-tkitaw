import test from 'node:test';
import assert from 'node:assert/strict';
import { getNextClassTarget, getYearEndOutcome, inferJenjangFromName } from './kelas';

test('inferJenjangFromName detects parallel Kelas B rooms (B1, B2) as Jenjang B', () => {
  assert.equal(inferJenjangFromName('Kelas A'), 'A');
  assert.equal(inferJenjangFromName('Kelas A1'), 'A');
  assert.equal(inferJenjangFromName('Kelompok Bermain'), 'A');
  assert.equal(inferJenjangFromName('KB'), 'A');
  assert.equal(inferJenjangFromName('Kelas B'), 'B');
  assert.equal(inferJenjangFromName('Kelas B1'), 'B');
  assert.equal(inferJenjangFromName('Kelas B2'), 'B');
  assert.equal(inferJenjangFromName('B2'), 'B');
});

test('parallel Kelas B1 and B2 never auto-promote to each other, while Kelas A promotes to Jenjang B', () => {
  const db = {
    masterKelas: [
      { kelas_id: 'K-A', nama_kelas: 'Kelas A', jenjang: 'A' as const, urutan: 1, aktif: true },
      { kelas_id: 'K-B1', nama_kelas: 'Kelas B1', jenjang: 'B' as const, urutan: 2, aktif: true },
      { kelas_id: 'K-B2', nama_kelas: 'Kelas B2', jenjang: 'B' as const, urutan: 3, aktif: true },
    ],
    siswa: [],
  };

  assert.deepEqual(getNextClassTarget(db, 'Kelas A'), {
    isFinal: false,
    nextClassName: 'Kelas B1',
    label: 'Lanjut ke Kelas B1',
  });
  assert.deepEqual(getNextClassTarget(db, 'Kelas B1'), {
    isFinal: true,
    nextClassName: 'Lulus',
    label: 'Lulus (Lanjut ke SD)',
  });
  assert.deepEqual(getNextClassTarget(db, 'Kelas B2'), {
    isFinal: true,
    nextClassName: 'Lulus',
    label: 'Lulus (Lanjut ke SD)',
  });
});

test('getYearEndOutcome promotes Kelas A automatically but waits for Guru/Admin decision on Kelas B', () => {
  const db = {
    masterKelas: [
      { kelas_id: 'K-A', nama_kelas: 'Kelas A', jenjang: 'A' as const, urutan: 1, aktif: true },
      { kelas_id: 'K-B1', nama_kelas: 'Kelas B1', jenjang: 'B' as const, urutan: 2, aktif: true },
      { kelas_id: 'K-B2', nama_kelas: 'Kelas B2', jenjang: 'B' as const, urutan: 3, aktif: true },
    ],
    siswa: [],
  };

  // Kelas A tanpa keputusan eksplisit tetap naik ke Kelas B1
  assert.deepEqual(
    getYearEndOutcome(db, {
      kelas_aktif: 'Kelas A',
      status_siswa: 'Aktif',
      keputusan_kenaikan: 'BELUM_DITENTUKAN',
    }),
    { outcome: 'NAIK_KELAS', nextClassName: 'Kelas B1' }
  );

  // Kelas B1 tanpa keputusan eksplisit TIDAK otomatis ke B2 dan TIDAK otomatis lulus
  assert.deepEqual(
    getYearEndOutcome(db, {
      kelas_aktif: 'Kelas B1',
      status_siswa: 'Aktif',
      keputusan_kenaikan: 'BELUM_DITENTUKAN',
    }),
    { outcome: 'TETAP_MENUNGGU_KEPUTUSAN', nextClassName: 'Kelas B1' }
  );

  // Kelas B1 baru lulus jika Guru/Admin memutuskan LULUS_KE_SD
  assert.deepEqual(
    getYearEndOutcome(db, {
      kelas_aktif: 'Kelas B1',
      status_siswa: 'Aktif',
      keputusan_kenaikan: 'LULUS_KE_SD',
    }),
    { outcome: 'LULUS_KE_SD', nextClassName: 'Lulus' }
  );

  // Kelas B1 tinggal kelas jika Guru/Admin memutuskan TINGGAL_KELAS
  assert.deepEqual(
    getYearEndOutcome(db, {
      kelas_aktif: 'Kelas B1',
      status_siswa: 'Aktif',
      keputusan_kenaikan: 'TINGGAL_KELAS',
    }),
    { outcome: 'TINGGAL_KELAS', nextClassName: 'Kelas B1' }
  );
});
