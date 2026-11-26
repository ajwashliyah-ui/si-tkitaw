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
  if (/\bb\b|kelas\s*b|tk\s*b|lanjut|sd|tahfidz/.test(lower)) return 'B';
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
  const idx = ordered.findIndex(
    (k) => k.nama_kelas.toLowerCase() === String(kelasName || '').trim().toLowerCase()
  );
  if (idx >= 0 && idx < ordered.length - 1) {
    const next = ordered[idx + 1].nama_kelas;
    return { isFinal: false, nextClassName: next, label: `Lanjut ke ${next}` };
  }
  return { isFinal: true, nextClassName: 'Lulus', label: 'Lulus (Lanjut ke SD)' };
}

export function isPromoteDecision(keputusan?: KeputusanKenaikan): boolean {
  return (
    keputusan === 'NAIK_KELAS_NEXT' ||
    keputusan === 'NAIK_KELAS_B' ||
    keputusan === 'LULUS_KE_SD'
  );
}
