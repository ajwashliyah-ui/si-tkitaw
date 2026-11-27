import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialSeedDatabase } from '../data/seedDatabase';
import {
  buildSchoolSheetTables,
  extractSpreadsheetId,
  parsePulledSheetTables,
  sanitizeCellForSheets,
} from './googleSheetsDirect';

test('extractSpreadsheetId handles full Google Sheets URLs and raw IDs', () => {
  assert.equal(
    extractSpreadsheetId('https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0'),
    '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
  );
  assert.equal(extractSpreadsheetId('  1AbC_Def-123  '), '1AbC_Def-123');
  assert.equal(extractSpreadsheetId(''), '');
});

test('buildSchoolSheetTables includes all 21 school database tabs', () => {
  const db = createInitialSeedDatabase();
  const tables = buildSchoolSheetTables(db);
  const titles = tables.map((t) => t.title);

  assert.equal(tables.length, 21);
  assert.ok(titles.includes('PengaturanSekolah'));
  assert.ok(titles.includes('Users'));
  assert.ok(titles.includes('Siswa'));
  assert.ok(titles.includes('KAIH_Foto_Bulanan'));
  assert.ok(titles.includes('Asesmen_HasilKarya'));
  assert.ok(titles.includes('Master_Materi'));
  assert.ok(titles.includes('Master_Tips'));
  assert.ok(titles.includes('Bank_Materi_Harian'));
  assert.ok(titles.includes('Master_ATP'));
  assert.ok(titles.includes('Master_Kelas'));
});

test('sanitizeCellForSheets prevents >45k base64 images and normalizes null/NaN values', () => {
  const hugeDataUrl = `data:image/jpeg;base64,${'A'.repeat(90000)}`;
  const sanitized = sanitizeCellForSheets(hugeDataUrl);
  assert.equal(typeof sanitized, 'string');
  assert.ok(String(sanitized).length < 100);
  assert.match(String(sanitized), /^\[Foto tersimpan di aplikasi/);

  assert.equal(sanitizeCellForSheets(null), '');
  assert.equal(sanitizeCellForSheets(undefined), '');
  assert.equal(sanitizeCellForSheets(Number.NaN), '');
  assert.equal(sanitizeCellForSheets(42), 42);
  assert.equal(sanitizeCellForSheets(true), true);
});

test('parsePulledSheetTables round-trips rows, admin_claimed, password_hash, and large photos', () => {
  const db = createInitialSeedDatabase();
  db.pengaturanSekolah.admin_claimed = true;
  db.asesmenHasilKarya = [
    {
      karya_id: 'KRY-1',
      tanggal: '2026-11-26',
      periode_bulan: '2026-11',
      semester: 'Semester 1',
      ta_id: 'TA-2026-2027',
      siswa_id: 'SIS-001',
      nama_anak: 'Muhammad Ali Al-Fatih',
      kelas: 'Kelas A',
      foto_drive_id: '',
      foto_url: `data:image/jpeg;base64,${'B'.repeat(80000)}`,
      deskripsi_karya: 'Kolase daun',
      analisis_nabp: 'Baik',
      analisis_jd: 'Mandiri',
      analisis_lmstrs: 'Kreatif',
      guru_nama: 'Ustadzah Siti',
      updated_at: '2026-11-26T08:00:00Z',
    },
  ];

  const tables = buildSchoolSheetTables(db);
  const map: Record<string, unknown[][]> = {};
  for (const t of tables) {
    map[t.title] = [t.headers, ...t.rows];
  }

  const usersTable = tables.find((t) => t.title === 'Users');
  assert.ok(usersTable);
  assert.ok(usersTable.headers.includes('password_hash'));

  const parsed = parsePulledSheetTables(map, db);
  assert.equal(parsed.siswa.length, db.siswa.length);
  assert.equal(parsed.users[0].password_hash, db.users[0].password_hash);
  assert.equal(parsed.asesmenHasilKarya[0].foto_url, db.asesmenHasilKarya[0].foto_url);
  assert.equal(parsed.pengaturanSekolah.admin_claimed, true);

  // Verify leading @ and uppercase usernames in pulled sheets normalize cleanly
  const noisyUsersMap: Record<string, unknown[][]> = {
    ...map,
    Users: [
      usersTable.headers,
      ...usersTable.rows.map((row, idx) =>
        idx === 0 ? [row[0], `  @GuruA  `, ...row.slice(2)] : row
      ),
    ],
  };
  const parsedNoisy = parsePulledSheetTables(noisyUsersMap, db);
  assert.equal(parsedNoisy.users[0].username, 'gurua');
});
