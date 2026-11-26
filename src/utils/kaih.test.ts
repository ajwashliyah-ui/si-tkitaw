import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getDailyKaihCompletion,
  getMonthCalendarGrid,
  getMonthlyKaihSummary,
  isWeekdaySeninJumat,
} from './kaih';
import { KaihHarianRecord } from '../types';

test('isWeekdaySeninJumat returns true for Mon-Fri and false for Sat-Sun', () => {
  // 2026-11-23 is Monday, 2026-11-27 is Friday, 2026-11-28 is Saturday, 2026-11-29 is Sunday
  assert.equal(isWeekdaySeninJumat('2026-11-23'), true);
  assert.equal(isWeekdaySeninJumat('2026-11-27'), true);
  assert.equal(isWeekdaySeninJumat('2026-11-28'), false);
  assert.equal(isWeekdaySeninJumat('2026-11-29'), false);
});

test('getMonthCalendarGrid builds full 30-day November 2026 calendar with Sunday offset', () => {
  const cells = getMonthCalendarGrid(2026, 11);
  // Nov 1, 2026 is Sunday -> Monday-first offset is 6 empty cells + 30 days = 36
  assert.equal(cells.length, 36);
  assert.equal(cells[5].dateStr, null);
  assert.equal(cells[6].dateStr, '2026-11-01');
  assert.equal(cells[6].isWeekend, true);
  assert.equal(cells[35].dateStr, '2026-11-30');
  assert.equal(cells[35].isWeekend, false);
});

test('getDailyKaihCompletion & getMonthlyKaihSummary identify lowest habit for adaptive tips', () => {
  const records: KaihHarianRecord[] = [
    {
      kaih_harian_id: 'K1',
      siswa_id: 'SIS-001',
      ta_id: 'TA-2026-2027',
      tanggal: '2026-11-24',
      periode_bulan: '2026-11',
      bangun_pagi: 'Sudah Terbiasa',
      beribadah: 'Sudah Terbiasa',
      berolahraga: 'Sudah Terbiasa',
      makan_sehat: 'Sudah Terbiasa',
      gemar_belajar: 'Sudah Terbiasa',
      bermasyarakat: 'Sudah Terbiasa',
      tidur_cepat: 'Belum Terbiasa',
      catatan_ortu: '',
      updated_at: '',
    },
  ];
  const daily = getDailyKaihCompletion(records[0]);
  assert.equal(daily.terbiasaCount, 6);
  const summary = getMonthlyKaihSummary(records, 'SIS-001', '2026-11');
  assert.equal(summary.totalDaysFilled, 1);
  assert.equal(summary.allHigh, false);
  assert.equal(summary.lowestAspect?.lowTipCode, 'KAIH_TIDUR_CEPAT_LOW');
});
