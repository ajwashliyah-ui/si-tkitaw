import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateAgeInMonths, evaluateAnthropometry } from './anthropometry';

test('calculateAgeInMonths computes accurate months from birthDate', () => {
  assert.equal(calculateAgeInMonths('2022-05-14', '2026-11-14'), 54);
  assert.equal(calculateAgeInMonths('2022-05-14', '2026-11-10'), 53);
});

test('evaluateAnthropometry identifies Normal growth', () => {
  const res = evaluateAnthropometry({
    usiaBulan: 54,
    jenisKelamin: 'L',
    bbKg: 17.5,
    tbCm: 106.5,
    lkCm: 50.0,
    lilaCm: 16.5,
    prevBbKg: 17.2,
    prevTbCm: 105.9,
  });
  assert.equal(res.statusGizi, 'Normal');
  assert.equal(res.kodePemicuTips, 'ANTRO_NORMAL');
  assert.equal(res.isStagnant, false);
});

test('evaluateAnthropometry detects stagnant trend when BB and TB do not advance', () => {
  const res = evaluateAnthropometry({
    usiaBulan: 54,
    jenisKelamin: 'L',
    bbKg: 17.2,
    tbCm: 106.0,
    lkCm: 50.0,
    lilaCm: 16.5,
    prevBbKg: 17.2,
    prevTbCm: 105.9,
  });
  assert.equal(res.isStagnant, true);
  assert.equal(res.kodePemicuTips, 'ANTRO_TREN_STAGNAN');
});

test('evaluateAnthropometry detects BB Kurang and LiLA alert', () => {
  const lowBb = evaluateAnthropometry({
    usiaBulan: 60,
    jenisKelamin: 'P',
    bbKg: 13.8,
    tbCm: 108.0,
    lkCm: 49.5,
    lilaCm: 15.0,
  });
  assert.equal(lowBb.statusGizi, 'BB Kurang');
  assert.equal(lowBb.kodePemicuTips, 'ANTRO_BB_KURANG');

  const lowLila = evaluateAnthropometry({
    usiaBulan: 60,
    jenisKelamin: 'P',
    bbKg: 17.0,
    tbCm: 108.0,
    lkCm: 49.5,
    lilaCm: 12.8,
  });
  assert.equal(lowLila.statusGizi, 'LiLA/LK Perlu Perhatian');
  assert.equal(lowLila.kodePemicuTips, 'ANTRO_LILA_LK_PERHATIAN');
});
