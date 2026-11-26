import test from 'node:test';
import assert from 'node:assert/strict';
import { computeStoryJourney } from './storyScene';
import { AntropometriRecord, Siswa } from '../types';

const SAMPLE_STUDENT: Siswa = {
  siswa_id: 'S-01',
  nis: '2026001',
  nama_anak: 'Aisyah',
  jenis_kelamin: 'P',
  tanggal_lahir: '2021-05-14',
  ortu_user_id: 'U-01',
  kelas_aktif: 'Kelas A',
  status_siswa: 'Aktif',
  target_literasi_kelas_b: 'TRACK_1',
};

const SAMPLE_ANTRO: AntropometriRecord = {
  log_id: 'A-1',
  siswa_id: 'S-01',
  ta_id: 'TA-2026-2027',
  periode_bulan: '2026-11',
  usia_bulan: 66,
  bb_kg: 18.2,
  tb_cm: 109.5,
  lk_cm: 50.5,
  lila_cm: 16.4,
  status_gizi_otomatis: 'Normal',
  kode_pemicu_tips: 'ANTRO_NORMAL',
  catatan_guru: '',
  updated_at: '2026-11-10T08:00:00Z',
};

test('computeStoryJourney returns calm tunas stage when child stats are minimal', () => {
  const res = computeStoryJourney({
    student: SAMPLE_STUDENT,
    latestAntro: null,
    hasLiterasi: false,
    dailyLogsCount: 0,
    agamaCount: 0,
    kaihDaysCount: 0,
    karyaCount: 0,
  });
  assert.equal(res.stage, 'tunas');
  assert.ok(res.progressScore < 40);
  assert.equal(res.pillars.length, 4);
});

test('computeStoryJourney returns bersemi stage at moderate progress', () => {
  const res = computeStoryJourney({
    student: SAMPLE_STUDENT,
    latestAntro: SAMPLE_ANTRO,
    hasLiterasi: true,
    dailyLogsCount: 1,
    agamaCount: 1,
    kaihDaysCount: 0,
    karyaCount: 0,
  });
  assert.equal(res.stage, 'bersemi');
  assert.ok(res.progressScore >= 40 && res.progressScore < 72);
});

test('computeStoryJourney returns bersinar stage when progress across pillars is high', () => {
  const res = computeStoryJourney({
    student: SAMPLE_STUDENT,
    latestAntro: SAMPLE_ANTRO,
    hasLiterasi: true,
    dailyLogsCount: 5,
    agamaCount: 4,
    kaihDaysCount: 6,
    karyaCount: 2,
  });
  assert.equal(res.stage, 'bersinar');
  assert.ok(res.progressScore >= 72);
  assert.ok(res.pillars.every((p) => p.active));
});
