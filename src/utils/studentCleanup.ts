import { SchoolDatabase } from '../types';

export function purgeStudentsFromDatabase(
  db: SchoolDatabase,
  studentIds: Iterable<string>
): SchoolDatabase {
  const idSet = new Set(Array.from(studentIds).filter(Boolean));
  if (idSet.size === 0) return db;

  return {
    ...db,
    siswa: db.siswa.filter((s) => !idSet.has(s.siswa_id)),
    riwayatKelas: db.riwayatKelas.filter((r) => !idSet.has(r.siswa_id)),
    antropometri: db.antropometri.filter((a) => !idSet.has(a.siswa_id)),
    literasi: db.literasi.filter((l) => !idSet.has(l.siswa_id)),
    keagamaan: db.keagamaan.filter((k) => !idSet.has(k.siswa_id)),
    kaihHarian: db.kaihHarian.filter((k) => !idSet.has(k.siswa_id)),
    kaihFotoBulanan: db.kaihFotoBulanan.filter((f) => !idSet.has(f.siswa_id)),
    ulasanOrtu: db.ulasanOrtu.filter((u) => !idSet.has(u.siswa_id)),
    logMateriHarian: db.logMateriHarian.filter((l) => !idSet.has(l.id_siswa)),
    daftarHadir: db.daftarHadir.filter((d) => !idSet.has(d.siswa_id)),
    asesmenAnekdot: db.asesmenAnekdot.filter((a) => !idSet.has(a.siswa_id)),
    asesmenHasilKarya: db.asesmenHasilKarya.filter((k) => !idSet.has(k.siswa_id)),
    asesmenCeklis: db.asesmenCeklis.filter((c) => !idSet.has(c.siswa_id)),
  };
}
