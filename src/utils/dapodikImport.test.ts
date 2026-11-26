import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { createInitialSeedDatabase } from '../data/seedDatabase';
import { parseDapodikExcelBuffer } from './dapodikImport';
import { DEFAULT_MASTER_KELAS } from './kelas';

function makeWorkbookBuffer(rows: (string | number)[][], sheetName = 'Peserta Didik'): ArrayBuffer {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  return out;
}

test('parseDapodikExcelBuffer parses Dapodik headers after title rows and detects duplicates', () => {
  const db = createInitialSeedDatabase();
  const existing = db.siswa[0]; // e.g. Ali Fikri, NIS 2026001
  assert.ok(existing);

  const customKelas = [
    ...DEFAULT_MASTER_KELAS,
    { kelas_id: 'KLS-TAH', nama_kelas: 'TK Tahfidz', jenjang: 'B' as const, urutan: 3, aktif: true },
  ];

  const buf = makeWorkbookBuffer([
    ['Daftar Peserta Didik TK IT Al-Washliyah'],
    ['Tahun Ajaran : 2026/2027'],
    [],
    ['No', 'Nama', 'NIPD', 'JK', 'NISN', 'Tanggal Lahir', 'Rombel Saat Ini', 'Nama Ibu'],
    [1, existing.nama_anak, existing.nis, existing.jenis_kelamin, '001122', existing.tanggal_lahir, 'Kelas A', 'Bunda'],
    [2, 'Nadia Khansa', '2026991', 'P', '001123', '15/06/2021', 'TK Tahfidz', 'Ibu Rina'],
    [3, 'Nadia Khansa', '2026991', 'P', '001123', '15/06/2021', 'TK Tahfidz', 'Ibu Rina'],
    [4, existing.nama_anak, '2026992', 'L', '001124', '2020-02-02', 'Kelas B', 'Ibu Lain'],
  ]);

  const parsed = parseDapodikExcelBuffer(buf, db.siswa, customKelas);
  assert.equal(parsed.totalCount, 4);
  assert.equal(parsed.newCount, 1);
  assert.equal(parsed.duplicateCount, 3);

  // Row 1: existing NIS -> flagged and unchecked by default
  assert.equal(parsed.rows[0].duplicateKind, 'EXISTING_NIS');
  assert.equal(parsed.rows[0].include, false);

  // Row 2: brand new student matched to custom class TK Tahfidz -> checked by default
  assert.equal(parsed.rows[1].duplicateKind, 'NONE');
  assert.equal(parsed.rows[1].include, true);
  assert.equal(parsed.rows[1].kelas_tujuan, 'TK Tahfidz');
  assert.equal(parsed.rows[1].tanggal_lahir, '2021-06-15');

  // Row 3: duplicate inside same Excel file -> flagged and unchecked by default
  assert.equal(parsed.rows[2].duplicateKind, 'IN_FILE_DUPLICATE');
  assert.equal(parsed.rows[2].include, false);

  // Row 4: same name as existing student with different NIS/DOB -> warning & unchecked by default
  assert.equal(parsed.rows[3].duplicateKind, 'EXISTING_NAME');
  assert.equal(parsed.rows[3].include, false);
});
