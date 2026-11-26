import { JenjangKurikulum, KeputusanKenaikan, MasterKelas, SchoolDatabase } from '../types';

export const DEFAULT_MASTER_KELAS: MasterKelas[] = [
  {
    kelas_id: 'KLS-A',
    nama_kelas: 'Kelas A',
    jenjang: 'A',
    urutan: 1,
    aktif: true,
  },
  {
    kelas_id: 'KLS-B',
    nama_kelas: 'Kelas B',
    jenjang: 'B',
    urutan: 2,
    aktif: true,
  },
];

export function getMasterKelasList(
  db: Pick<SchoolDatabase, 'masterKelas' | 'siswa'>,
  includeInactive = false
): MasterKelas[] {
  const base: MasterKelas[] =
    db.masterKelas && db.masterKelas.length > 0
      ? db.masterKelas.map((k, idx) => ({
          ...k,
          jenjang: k.jenjang === 'B' ? 'B' : 'A',
          urutan: Number(k.urutan) || idx + 1,
          aktif: k.aktif !== false,
        }))
      : DEFAULT_MASTER_KELAS.map((k) => ({ ...k }));

  const existingNames = new Set(base.map((k) => k.nama_kelas.toLowerCase()));
  let maxOrder = base.reduce((m, k) => Math.max(m, k.urutan), 0);

  for (const s of db.siswa || []) {
    const kName = String(s.kelas_aktif || '').trim();
    if (!kName || kName === 'Lulus' || existingNames.has(kName.toLowerCase())) continue;
    existingNames.add(kName.toLowerCase());
    maxOrder += 1;
    base.push({
      kelas_id: `KLS-AUTO-${maxOrder}`,
      nama_kelas: kName,
      jenjang: inferJenjangFromName(kName),
      urutan: maxOrder,
      aktif: true,
    });
  }

  return base
    .filter((k) => includeInactive || k.aktif !== false)
    .sort((a, b) => a.urutan - b.urutan);
}

export function inferJenjangFromName(namaKelas: string): JenjangKurikulum {
  const lower = namaKelas.toLowerCase();
  if (/\b(?:kelas\s*|tk\s*|kelompok\s*)?b\d*\b|lanjut|sd|tahfidz/.test(lower)) return 'B';
  return 'A';
}

export function getKelasMeta(
  db: Pick<SchoolDatabase, 'masterKelas' | 'siswa'>,
  kelasName: string
): MasterKelas | undefined {
  const list = getMasterKelasList(db, true);
  return list.find((k) => k.nama_kelas.toLowerCase() === String(kelasName || '').trim().toLowerCase());
}

export function isKelasLanjutan(
  db: Pick<SchoolDatabase, 'masterKelas' | 'siswa'>,
  kelasName: string
): boolean {
  if (!kelasName || kelasName === 'Lulus') return false;
  const meta = getKelasMeta(db, kelasName);
  if (meta) return meta.jenjang === 'B';
  return inferJenjangFromName(kelasName) === 'B';
}

export function getNextClassTarget(
  db: Pick<SchoolDatabase, 'masterKelas' | 'siswa'>,
  kelasName: string
): { isFinal: boolean; nextClassName: string; label: string } {
  const ordered = getMasterKelasList(db);
  const currentMeta = getKelasMeta(db, kelasName);
  const currentIsB = currentMeta ? currentMeta.jenjang === 'B' : isKelasLanjutan(db, kelasName);

  // Semua kelas jenjang B (termasuk rombel paralel seperti B1, B2) tidak naik ke kelas B lain;
  // keputusan akhir hanya Tinggal Kelas atau Lulus ke SD dari Guru/Admin.
  if (currentIsB) {
    return { isFinal: true, nextClassName: 'Lulus', label: 'Lulus (Lanjut ke SD)' };
  }

  // Kelas jenjang A naik ke kelas jenjang B pertama yang aktif (bukan sesama kelas A).
  const firstJenjangB = ordered.find((k) => k.jenjang === 'B');
  if (firstJenjangB) {
    return {
      isFinal: false,
      nextClassName: firstJenjangB.nama_kelas,
      label: `Lanjut ke ${firstJenjangB.nama_kelas}`,
    };
  }

  return { isFinal: true, nextClassName: 'Lulus', label: 'Lulus (Lanjut ke SD)' };
}

export type YearEndOutcome =
  | 'NAIK_KELAS'
  | 'LULUS_KE_SD'
  | 'TINGGAL_KELAS'
  | 'TETAP_MENUNGGU_KEPUTUSAN';

export function getYearEndOutcome(
  db: Pick<SchoolDatabase, 'masterKelas' | 'siswa'>,
  siswa: {
    kelas_aktif: string;
    status_siswa?: string;
    keputusan_kenaikan?: KeputusanKenaikan;
  }
): { outcome: YearEndOutcome; nextClassName: string } {
  if (siswa.status_siswa !== 'Aktif' || siswa.kelas_aktif === 'Lulus') {
    return { outcome: 'TETAP_MENUNGGU_KEPUTUSAN', nextClassName: siswa.kelas_aktif };
  }
  if (siswa.keputusan_kenaikan === 'TINGGAL_KELAS') {
    return { outcome: 'TINGGAL_KELAS', nextClassName: siswa.kelas_aktif };
  }
  if (siswa.keputusan_kenaikan === 'LULUS_KE_SD') {
    return { outcome: 'LULUS_KE_SD', nextClassName: 'Lulus' };
  }
  const target = getNextClassTarget(db, siswa.kelas_aktif);
  if (target.isFinal) {
    // Kelas B menunggu keputusan resmi Guru/Admin (Tinggal Kelas atau Lulus ke SD).
    return { outcome: 'TETAP_MENUNGGU_KEPUTUSAN', nextClassName: siswa.kelas_aktif };
  }
  // Kelas A tetap otomatis naik ke jenjang B kecuali ditandai Tinggal Kelas.
  return { outcome: 'NAIK_KELAS', nextClassName: target.nextClassName };
}

export function isPromoteDecision(keputusan?: KeputusanKenaikan): boolean {
  return (
    keputusan === 'NAIK_KELAS_NEXT' ||
    keputusan === 'NAIK_KELAS_B' ||
    keputusan === 'LULUS_KE_SD'
  );
}
