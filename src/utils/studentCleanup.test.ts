import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialSeedDatabase } from '../data/seedDatabase';
import { purgeStudentsFromDatabase } from './studentCleanup';

test('purgeStudentsFromDatabase removes target student and all related records across every table', () => {
  const db = createInitialSeedDatabase();
  const targetId = db.siswa[0]?.siswa_id;
  assert.ok(targetId, 'Expected at least one seeded student');

  // Ensure target student has records in multiple tables before purge
  const hasLogsBefore = db.logMateriHarian.some((l) => l.id_siswa === targetId);
  assert.ok(hasLogsBefore || db.antropometri.some((a) => a.siswa_id === targetId));

  const cleaned = purgeStudentsFromDatabase(db, [targetId]);

  assert.equal(cleaned.siswa.some((s) => s.siswa_id === targetId), false);
  assert.equal(cleaned.riwayatKelas.some((r) => r.siswa_id === targetId), false);
  assert.equal(cleaned.antropometri.some((a) => a.siswa_id === targetId), false);
  assert.equal(cleaned.literasi.some((l) => l.siswa_id === targetId), false);
  assert.equal(cleaned.keagamaan.some((k) => k.siswa_id === targetId), false);
  assert.equal(cleaned.kaihHarian.some((k) => k.siswa_id === targetId), false);
  assert.equal(cleaned.kaihFotoBulanan.some((f) => f.siswa_id === targetId), false);
  assert.equal(cleaned.ulasanOrtu.some((u) => u.siswa_id === targetId), false);
  assert.equal(cleaned.logMateriHarian.some((l) => l.id_siswa === targetId), false);
  assert.equal(cleaned.daftarHadir.some((d) => d.siswa_id === targetId), false);
  assert.equal(cleaned.asesmenAnekdot.some((a) => a.siswa_id === targetId), false);
  assert.equal(cleaned.asesmenHasilKarya.some((k) => k.siswa_id === targetId), false);
  assert.equal(cleaned.asesmenCeklis.some((c) => c.siswa_id === targetId), false);

  // Other students remain untouched
  assert.equal(cleaned.siswa.length, db.siswa.length - 1);
});
