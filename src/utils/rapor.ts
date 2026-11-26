import {
  AntropometriRecord,
  KaihHarianRecord,
  KeagamaanRecord,
  LiterasiRecord,
  LogMateriHarian,
  MasterTips,
  Siswa,
  StatusPenguasaanHarian,
} from '../types';
import { getMonthlyKaihSummary } from './kaih';
import { AttendanceRekapRow } from './attendance';

export function statusToStars(status: StatusPenguasaanHarian): 1 | 2 | 3 | 4 {
  switch (status) {
    case 'Lancar':
      return 4;
    case 'Perlu Latihan':
      return 3;
    case 'Mulai Mengenal':
      return 2;
    case 'Belum Mengenal':
    default:
      return 1;
  }
}

export interface AdaptiveLevelInfo {
  level: 1 | 2 | 3 | 4;
  title: string;
  badgeText: string;
  appreciation: string;
  accentBg: string;
  accentBorder: string;
  accentText: string;
}

export function getAdaptiveLevel(avgStars: number): AdaptiveLevelInfo {
  if (avgStars >= 3.5) {
    return {
      level: 4,
      title: 'MasyaAllah, Bintang Juara!',
      badgeText: '4 Bintang · Lancar & Next Level',
      appreciation:
        'MasyaAllah, perkembangan ananda bulan ini sangat luar biasa! Terus pertahankan semangat belajarnya dan siap menuju tantangan berikutnya.',
      accentBg: 'bg-emerald-50',
      accentBorder: 'border-emerald-200',
      accentText: 'text-emerald-900',
    };
  }
  if (avgStars >= 2.5) {
    return {
      level: 3,
      title: 'Alhamdulillah, Semakin Hebat!',
      badgeText: '3 Bintang · Berkembang Baik',
      appreciation:
        'Alhamdulillah, ananda berkembang dengan sangat baik bulan ini! Sedikit latihan rutin di rumah akan membuat ananda makin lancar.',
      accentBg: 'bg-sky-50',
      accentBorder: 'border-sky-200',
      accentText: 'text-sky-900',
    };
  }
  if (avgStars >= 1.5) {
    return {
      level: 2,
      title: 'Ayo Semangat Berlatih!',
      badgeText: '2 Bintang · Semangat Berlatih',
      appreciation:
        'Ananda mulai mengenal materi dengan baik. Yuk Ayah & Bunda dampingi latihan ringan 5–10 menit setiap hari agar semakin percaya diri!',
      accentBg: 'bg-amber-50',
      accentBorder: 'border-amber-200',
      accentText: 'text-amber-900',
    };
  }
  return {
    level: 1,
    title: 'Langkah Pertama yang Indah!',
    badgeText: '1 Bintang · Tahap Pengenalan',
    appreciation:
      'Setiap anak hebat selalu mulai dari langkah pertama. Bulan ini ananda baru berkenalan dengan materi baru — mari terus semangati dengan cara bermain yang menyenangkan!',
    accentBg: 'bg-rose-50',
    accentBorder: 'border-rose-200',
    accentText: 'text-rose-900',
  };
}

export interface CategorySummary {
  kategori: string;
  bidang: 'Literasi' | 'Hijaiyah_Iqra';
  items: string[];
  halamanRange: string;
  avgStars: number;
  roundedStars: number;
  sessionCount: number;
}

export interface MonthlyRaporData {
  siswa: Siswa;
  periodeBulan: string;
  totalSesi: number;
  literasiCategories: CategorySummary[];
  hijaiyahCategories: CategorySummary[];
  avgLiterasiStars: number;
  avgHijaiyahStars: number;
  overallAvgStars: number;
  overallRoundedStars: number;
  adaptiveLevel: AdaptiveLevelInfo;
  weeklyStars: Array<{ weekLabel: string; avgStars: number; roundedStars: number; count: number }>;
  jilidIqraTerakhir: string;
  catatanGuruTerbaru: string;
  aktivitas5Menit: string[];
  presensi?: AttendanceRekapRow;
}

export function buildMonthlyRapor(params: {
  siswa: Siswa;
  logs: LogMateriHarian[];
  tahun: number;
  bulan: number; // 1-12
  presensi?: AttendanceRekapRow;
}): MonthlyRaporData {
  const { siswa, logs, tahun, bulan, presensi } = params;
  const periodeBulan = `${tahun}-${String(bulan).padStart(2, '0')}`;

  const monthLogs = logs
    .filter((l) => l.id_siswa === siswa.siswa_id && l.tanggal.startsWith(periodeBulan))
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal));

  const groupByCategory = (bidang: 'Literasi' | 'Hijaiyah_Iqra'): CategorySummary[] => {
    const filtered = monthLogs.filter((l) => l.bidang === bidang);
    const map = new Map<string, LogMateriHarian[]>();
    for (const log of filtered) {
      const list = map.get(log.kategori) || [];
      list.push(log);
      map.set(log.kategori, list);
    }

    const result: CategorySummary[] = [];
    for (const [kategori, catLogs] of map.entries()) {
      const itemSet = new Set<string>();
      const pages: string[] = [];
      let starSum = 0;

      for (const row of catLogs) {
        starSum += statusToStars(row.status_penguasaan);
        row.item_dipilih
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .forEach((item) => itemSet.add(item));
        if (row.halaman_iqra && row.halaman_iqra.trim()) {
          pages.push(row.halaman_iqra.trim());
        }
      }

      const avg = Number((starSum / catLogs.length).toFixed(2));
      const halamanRange =
        pages.length > 1
          ? `${pages[0]} s.d. ${pages[pages.length - 1]}`
          : pages.length === 1
          ? pages[0]
          : '';

      result.push({
        kategori,
        bidang,
        items: Array.from(itemSet),
        halamanRange,
        avgStars: avg,
        roundedStars: Math.max(1, Math.min(4, Math.round(avg))),
        sessionCount: catLogs.length,
      });
    }
    return result;
  };

  const literasiCategories = groupByCategory('Literasi');
  const hijaiyahCategories = groupByCategory('Hijaiyah_Iqra');

  const calcAvg = (cats: CategorySummary[]) => {
    if (cats.length === 0) return 0;
    const total = cats.reduce((acc, c) => acc + c.avgStars, 0);
    return Number((total / cats.length).toFixed(2));
  };

  const avgLiterasiStars = calcAvg(literasiCategories);
  const avgHijaiyahStars = calcAvg(hijaiyahCategories);

  const overallAvgStars =
    monthLogs.length > 0
      ? Number(
          (
            monthLogs.reduce((acc, l) => acc + statusToStars(l.status_penguasaan), 0) /
            monthLogs.length
          ).toFixed(2)
        )
      : 0;

  const overallRoundedStars =
    overallAvgStars > 0 ? Math.max(1, Math.min(4, Math.round(overallAvgStars))) : 1;

  // Weekly progress Minggu 1..4
  const weeklyBuckets: LogMateriHarian[][] = [[], [], [], []];
  for (const log of monthLogs) {
    const day = Number(log.tanggal.split('-')[2] || '1');
    const weekIdx = Math.min(3, Math.floor((day - 1) / 7));
    weeklyBuckets[weekIdx].push(log);
  }
  const weeklyStars = weeklyBuckets.map((bucket, idx) => {
    if (bucket.length === 0) {
      return { weekLabel: `Minggu ${idx + 1}`, avgStars: 0, roundedStars: 0, count: 0 };
    }
    const avg = Number(
      (
        bucket.reduce((acc, l) => acc + statusToStars(l.status_penguasaan), 0) / bucket.length
      ).toFixed(2)
    );
    return {
      weekLabel: `Minggu ${idx + 1}`,
      avgStars: avg,
      roundedStars: Math.max(1, Math.min(4, Math.round(avg))),
      count: bucket.length,
    };
  });

  // Latest Iqra page
  const iqraLogs = monthLogs.filter((l) => l.kategori === 'Iqra' && l.halaman_iqra);
  const jilidIqraTerakhir =
    iqraLogs.length > 0
      ? `${iqraLogs[iqraLogs.length - 1].kode_item.replace('IQR-', 'Iqra ').replace(/[A-Z]$/, '')} (${iqraLogs[iqraLogs.length - 1].halaman_iqra})`
      : hijaiyahCategories.length > 0
      ? 'Pra-Iqra / Hijaiyah'
      : 'Belum tercatat bulan ini';

  // Best / latest teacher note
  const notedLogs = monthLogs.filter((l) => l.catatan_guru.trim().length > 0);
  const catatanGuruTerbaru =
    notedLogs.length > 0
      ? notedLogs[notedLogs.length - 1].catatan_guru
      : 'Ananda mengikuti kegiatan belajar bulan ini dengan penuh semangat.';

  // 5-minute home practice tips from Perlu Latihan / Mulai Mengenal
  const needsPractice = monthLogs.filter(
    (l) => l.status_penguasaan === 'Perlu Latihan' || l.status_penguasaan === 'Mulai Mengenal'
  );
  const aktivitas5Menit: string[] = needsPractice.slice(-3).map((l) => {
    const labelHal = l.halaman_iqra ? ` (${l.halaman_iqra})` : '';
    return `Ulangi 5 menit ${l.kategori}${labelHal}: "${l.item_dipilih}" sambil bermain tebak bunyi bersama Ayah/Bunda.`;
  });

  if (aktivitas5Menit.length === 0 && monthLogs.length > 0) {
    aktivitas5Menit.push(
      'Bacakan buku cerita islami bergambar selama 5 menit sebelum tidur dan minta ananda menunjuk kata atau huruf yang ia kenal.'
    );
  }

  return {
    siswa,
    periodeBulan,
    totalSesi: monthLogs.length,
    literasiCategories,
    hijaiyahCategories,
    avgLiterasiStars,
    avgHijaiyahStars,
    overallAvgStars,
    overallRoundedStars,
    adaptiveLevel: getAdaptiveLevel(overallAvgStars > 0 ? overallAvgStars : 1),
    weeklyStars,
    jilidIqraTerakhir,
    catatanGuruTerbaru,
    aktivitas5Menit,
    presensi,
  };
}

/**
 * Selects up to 4 adaptive parent tip cards from Master_Tips:
 * 1 Antropometri, 1 Literasi, 1 7 KAIH, 1 Keagamaan.
 */
export function selectAdaptiveParentTips(params: {
  siswa: Siswa;
  periodeBulan: string;
  masterTips: MasterTips[];
  antropometri: AntropometriRecord[];
  literasi: LiterasiRecord[];
  kaihHarian: KaihHarianRecord[];
  keagamaan: KeagamaanRecord[];
}): MasterTips[] {
  const { siswa, periodeBulan, masterTips, antropometri, literasi, kaihHarian, keagamaan } = params;
  const activeTips = masterTips.filter((t) => t.aktif);
  const findTip = (code: string) => activeTips.find((t) => t.kondisi_pemicu === code);

  const selected: MasterTips[] = [];

  // 1. Antropometri
  const antroList = antropometri
    .filter((a) => a.siswa_id === siswa.siswa_id)
    .sort((a, b) => a.periode_bulan.localeCompare(b.periode_bulan));
  const latestAntro = antroList[antroList.length - 1];
  const antroTip = findTip(latestAntro?.kode_pemicu_tips || 'ANTRO_NORMAL');
  if (antroTip) selected.push(antroTip);

  // 2. Literasi
  const litList = literasi
    .filter((l) => l.siswa_id === siswa.siswa_id)
    .sort((a, b) => a.periode_bulan.localeCompare(b.periode_bulan));
  const latestLit = litList[litList.length - 1];
  const isLow = (val?: string) =>
    val === 'Belum Berkembang (BB)' || val === 'Mulai Berkembang (MB)';

  let litCode = 'LIT_A_HIGH';
  if (siswa.kelas_aktif === 'Kelas A') {
    if (latestLit && isLow(latestLit.nilai_huruf_atau_dasar)) litCode = 'LIT_A_HURUF_LOW';
    else if (latestLit && isLow(latestLit.nilai_sukukata_atau_lanjutan))
      litCode = 'LIT_A_SUKUKATA_LOW';
    else litCode = 'LIT_A_HIGH';
  } else {
    const track = latestLit?.track_level_dipilih || siswa.target_literasi_kelas_b || 'TRACK_1';
    const anyLow =
      latestLit &&
      (isLow(latestLit.nilai_huruf_atau_dasar) ||
        isLow(latestLit.nilai_sukukata_atau_lanjutan) ||
        isLow(latestLit.nilai_kalimat_opsional));
    if (track === 'KUSTOM') litCode = 'LIT_B_KUSTOM';
    else if (track === 'TRACK_1') litCode = anyLow ? 'LIT_B_TRACK1_LOW' : 'LIT_B_TRACK1_HIGH';
    else if (track === 'TRACK_2') litCode = anyLow ? 'LIT_B_TRACK2_LOW' : 'LIT_B_TRACK2_HIGH';
    else if (track === 'TRACK_3') litCode = anyLow ? 'LIT_B_TRACK3_LOW' : 'LIT_B_TRACK3_HIGH';
    else if (track === 'TRACK_4') litCode = anyLow ? 'LIT_B_TRACK4_LOW' : 'LIT_B_TRACK4_HIGH';
  }
  const litTip = findTip(litCode);
  if (litTip) selected.push(litTip);

  // 3. 7 KAIH (from daily calendar summary)
  const kaihSummary = getMonthlyKaihSummary(kaihHarian, siswa.siswa_id, periodeBulan);
  let kaihCode = 'KAIH_ALL_HIGH';
  if (kaihSummary.totalDaysFilled > 0 && !kaihSummary.allHigh && kaihSummary.lowestAspect) {
    kaihCode = kaihSummary.lowestAspect.lowTipCode;
  } else if (kaihSummary.totalDaysFilled === 0) {
    kaihCode = 'KAIH_GEMAR_BELAJAR_LOW';
  }
  const kaihTip = findTip(kaihCode);
  if (kaihTip) selected.push(kaihTip);

  // 4. Keagamaan (prioritize aspects needing guidance)
  const agamaList = keagamaan.filter((k) => k.siswa_id === siswa.siswa_id);
  const needSupport = agamaList.find(
    (k) => k.status_progres === 'Baru Mengenalkan' || k.status_progres === 'Menirukan'
  );
  let agamaCode = 'AGAMA_SURAT_HIGH';
  const targetAgama = needSupport || agamaList[agamaList.length - 1];
  if (targetAgama) {
    const low =
      targetAgama.status_progres === 'Baru Mengenalkan' ||
      targetAgama.status_progres === 'Menirukan';
    if (targetAgama.kategori === 'Surat Pendek')
      agamaCode = low ? 'AGAMA_SURAT_LOW' : 'AGAMA_SURAT_HIGH';
    else if (targetAgama.kategori === 'Doa Harian')
      agamaCode = low ? 'AGAMA_DOA_LOW' : 'AGAMA_DOA_HIGH';
    else if (targetAgama.kategori === 'Hijaiyah / Iqra')
      agamaCode = low ? 'AGAMA_IQRA_LOW' : 'AGAMA_IQRA_HIGH';
    else agamaCode = low ? 'AGAMA_HADITS_LOW' : 'AGAMA_HADITS_HIGH';
  }
  const agamaTip = findTip(agamaCode);
  if (agamaTip) selected.push(agamaTip);

  return selected.slice(0, 4);
}
