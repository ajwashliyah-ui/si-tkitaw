import { AspekKaihKey, KaihHarianRecord, SkalaKaih } from '../types';

export const KAIH_ASPEK_LIST: Array<{
  key: AspekKaihKey;
  label: string;
  shortLabel: string;
  description: string;
  lowTipCode: string;
}> = [
  {
    key: 'bangun_pagi',
    label: '1. Bangun Pagi',
    shortLabel: 'Bangun Pagi',
    description: 'Bangun subuh/pagi dengan ceria tanpa rewel',
    lowTipCode: 'KAIH_BANGUN_PAGI_LOW',
  },
  {
    key: 'beribadah',
    label: '2. Beribadah',
    shortLabel: 'Beribadah',
    description: 'Shalat, berdoa sebelum/sesudah kegiatan, dan mengaji',
    lowTipCode: 'KAIH_BERIBADAH_LOW',
  },
  {
    key: 'berolahraga',
    label: '3. Berolahraga',
    shortLabel: 'Berolahraga',
    description: 'Gerak fisik aktif, senam pagi, atau bermain di luar',
    lowTipCode: 'KAIH_BEROLAHRAGA_LOW',
  },
  {
    key: 'makan_sehat',
    label: '4. Makan Sehat & Bergizi',
    shortLabel: 'Makan Sehat',
    description: 'Makan sayur, buah, protein, dan minum air putih cukup',
    lowTipCode: 'KAIH_MAKAN_SEHAT_LOW',
  },
  {
    key: 'gemar_belajar',
    label: '5. Gemar Belajar',
    shortLabel: 'Gemar Belajar',
    description: 'Membaca buku cerita, mengulang Iqra/huruf, atau bertanya aktif',
    lowTipCode: 'KAIH_GEMAR_BELAJAR_LOW',
  },
  {
    key: 'bermasyarakat',
    label: '6. Bermasyarakat',
    shortLabel: 'Bermasyarakat',
    description: 'Salam, senyum, berbagi, dan ramah kepada keluarga & tetangga',
    lowTipCode: 'KAIH_BERMASYARAKAT_LOW',
  },
  {
    key: 'tidur_cepat',
    label: '7. Tidur Cepat',
    shortLabel: 'Tidur Cepat',
    description: 'Istirahat malam tepat waktu (sekitar pukul 20.00–20.30)',
    lowTipCode: 'KAIH_TIDUR_CEPAT_LOW',
  },
];

export function skalaKaihToScore(skala: SkalaKaih): number {
  if (skala === 'Sudah Terbiasa') return 3;
  if (skala === 'Mulai Terbiasa') return 2;
  return 1;
}

export function isWeekdaySeninJumat(dateStr: string): boolean {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return false;
  const dt = new Date(y, m - 1, d);
  const day = dt.getDay(); // 0=Sun, 1=Mon ... 5=Fri, 6=Sat
  return day >= 1 && day <= 5;
}

export interface CalendarCell {
  dateStr: string | null;
  dayNumber: number | null;
  isWeekend: boolean;
}

/**
 * Generates Monday-first calendar cells for a given year & month (1-12).
 */
export function getMonthCalendarGrid(year: number, month: number): CalendarCell[] {
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  // Convert Sunday=0..Saturday=6 into Monday=0..Sunday=6
  const startOffset = (firstDay.getDay() + 6) % 7;

  const cells: CalendarCell[] = [];
  for (let i = 0; i < startOffset; i++) {
    cells.push({ dateStr: null, dayNumber: null, isWeekend: false });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const dateStr = `${year}-${mm}-${dd}`;
    const dayOfWeek = new Date(year, month - 1, day).getDay();
    cells.push({
      dateStr,
      dayNumber: day,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    });
  }

  return cells;
}

export function getDailyKaihCompletion(record?: KaihHarianRecord): {
  terbiasaCount: number;
  mulaiCount: number;
  scoreAvg: number;
} {
  if (!record) {
    return { terbiasaCount: 0, mulaiCount: 0, scoreAvg: 0 };
  }
  let terbiasaCount = 0;
  let mulaiCount = 0;
  let sum = 0;
  for (const item of KAIH_ASPEK_LIST) {
    const val = record[item.key];
    if (val === 'Sudah Terbiasa') terbiasaCount += 1;
    else if (val === 'Mulai Terbiasa') mulaiCount += 1;
    sum += skalaKaihToScore(val);
  }
  return {
    terbiasaCount,
    mulaiCount,
    scoreAvg: Number((sum / KAIH_ASPEK_LIST.length).toFixed(2)),
  };
}

export function getMonthlyKaihSummary(
  records: KaihHarianRecord[],
  siswaId: string,
  periodeBulan: string
): {
  totalDaysFilled: number;
  aspectAverages: Record<AspekKaihKey, number>;
  lowestAspect: { key: AspekKaihKey; label: string; lowTipCode: string; avg: number } | null;
  allHigh: boolean;
} {
  const filtered = records.filter(
    (r) => r.siswa_id === siswaId && r.periode_bulan === periodeBulan
  );

  const aspectAverages: Record<AspekKaihKey, number> = {
    bangun_pagi: 0,
    beribadah: 0,
    berolahraga: 0,
    makan_sehat: 0,
    gemar_belajar: 0,
    bermasyarakat: 0,
    tidur_cepat: 0,
  };

  if (filtered.length === 0) {
    return {
      totalDaysFilled: 0,
      aspectAverages,
      lowestAspect: null,
      allHigh: false,
    };
  }

  let lowest: { key: AspekKaihKey; label: string; lowTipCode: string; avg: number } | null = null;
  let allAboveThreshold = true;

  for (const aspek of KAIH_ASPEK_LIST) {
    const sum = filtered.reduce((acc, row) => acc + skalaKaihToScore(row[aspek.key]), 0);
    const avg = Number((sum / filtered.length).toFixed(2));
    aspectAverages[aspek.key] = avg;
    if (avg < 2.6) allAboveThreshold = false;
    if (!lowest || avg < lowest.avg) {
      lowest = { key: aspek.key, label: aspek.shortLabel, lowTipCode: aspek.lowTipCode, avg };
    }
  }

  return {
    totalDaysFilled: filtered.length,
    aspectAverages,
    lowestAspect: lowest,
    allHigh: allAboveThreshold,
  };
}
