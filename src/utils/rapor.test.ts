import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMonthlyRapor,
  getAdaptiveLevel,
  selectAdaptiveParentTips,
  statusToStars,
} from './rapor';
import { createInitialSeedDatabase } from '../data/seedDatabase';

test('statusToStars converts mastery status into 1-4 star rating', () => {
  assert.equal(statusToStars('Belum Mengenal'), 1);
  assert.equal(statusToStars('Mulai Mengenal'), 2);
  assert.equal(statusToStars('Perlu Latihan'), 3);
  assert.equal(statusToStars('Lancar'), 4);
});

test('getAdaptiveLevel returns Level 1-4 boundaries accurately', () => {
  assert.equal(getAdaptiveLevel(3.75).level, 4);
  assert.equal(getAdaptiveLevel(3.0).level, 3);
  assert.equal(getAdaptiveLevel(2.0).level, 2);
  assert.equal(getAdaptiveLevel(1.2).level, 1);
});

test('buildMonthlyRapor aggregates daily logs and generates 5-minute home practice tips', () => {
  const db = createInitialSeedDatabase();
  const ali = db.siswa.find((s) => s.siswa_id === 'SIS-001')!;
  const rapor = buildMonthlyRapor({
    siswa: ali,
    logs: db.logMateriHarian,
    tahun: 2026,
    bulan: 11,
  });
  assert.equal(rapor.totalSesi, 4);
  assert.equal(rapor.literasiCategories.length, 3);
  assert.equal(rapor.hijaiyahCategories.length, 1);
  assert.equal(rapor.overallAvgStars, 3.5);
  assert.equal(rapor.adaptiveLevel.level, 4);
  assert.ok(rapor.aktivitas5Menit.length >= 1);
});

test('selectAdaptiveParentTips returns 4 matched tips (Antro, Literasi, KAIH, Keagamaan)', () => {
  const db = createInitialSeedDatabase();
  const ali = db.siswa.find((s) => s.siswa_id === 'SIS-001')!;
  const tips = selectAdaptiveParentTips({
    siswa: ali,
    periodeBulan: '2026-11',
    masterTips: db.masterTips,
    antropometri: db.antropometri,
    literasi: db.literasi,
    kaihHarian: db.kaihHarian,
    keagamaan: db.keagamaan,
  });
  assert.equal(tips.length, 4);
  assert.equal(tips[0].kategori_pemicu, 'Antropometri');
  assert.equal(tips[1].kategori_pemicu, 'Literasi');
  assert.equal(tips[2].kategori_pemicu, '7 KAIH');
  assert.equal(tips[3].kategori_pemicu, 'Keagamaan');
});
