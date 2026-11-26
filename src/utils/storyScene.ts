import { AntropometriRecord, Siswa } from '../types';

export type JourneyStage = 'tunas' | 'bersemi' | 'bersinar';

export type StoryPillarId = 'fisik' | 'literasi' | 'keagamaan' | 'kaih';

export interface StoryPillar {
  id: StoryPillarId;
  step: number;
  label: string;
  statusText: string;
  detailText: string;
  progressRatio: number; // 0..1
  active: boolean;
  targetTab: 'perkembangan' | 'kaih';
  ctaLabel: string;
}

export interface StoryJourneyState {
  stage: JourneyStage;
  progressScore: number; // 0..100
  stageLabel: string;
  stageHeadline: string;
  stageNarrative: string;
  pillars: StoryPillar[];
}

export interface ComputeStoryJourneyInput {
  student: Siswa;
  latestAntro: AntropometriRecord | null | undefined;
  hasLiterasi: boolean;
  dailyLogsCount: number;
  agamaCount: number;
  kaihDaysCount: number;
  karyaCount: number;
}

export function computeStoryJourney(input: ComputeStoryJourneyInput): StoryJourneyState {
  const {
    student,
    latestAntro,
    hasLiterasi,
    dailyLogsCount,
    agamaCount,
    kaihDaysCount,
    karyaCount,
  } = input;

  // 1. Physical growth pillar (0..25)
  const fisikRatio = latestAntro
    ? latestAntro.status_gizi_otomatis === 'Normal'
      ? 1
      : 0.72
    : 0.15;

  // 2. Literacy & daily study pillar (0..25)
  const litRaw = (hasLiterasi ? 0.5 : 0) + Math.min(dailyLogsCount, 5) * 0.1 + (karyaCount > 0 ? 0.15 : 0);
  const literasiRatio = Math.min(1, Math.max(0.1, litRaw));

  // 3. Religious habits & memorization pillar (0..25)
  const agamaRatio = agamaCount === 0 ? 0.1 : Math.min(1, 0.35 + agamaCount * 0.22);

  // 4. 7 KAIH home habits pillar (0..25)
  const kaihRatio = kaihDaysCount === 0 ? 0.1 : Math.min(1, 0.25 + kaihDaysCount * 0.15);

  const rawScore = (fisikRatio + literasiRatio + agamaRatio + kaihRatio) * 25;
  const progressScore = Math.max(8, Math.min(100, Math.round(rawScore)));

  let stage: JourneyStage = 'tunas';
  if (progressScore >= 72) {
    stage = 'bersinar';
  } else if (progressScore >= 40) {
    stage = 'bersemi';
  }

  const stageMeta: Record<
    JourneyStage,
    { label: string; headline: string; narrative: string }
  > = {
    tunas: {
      label: 'Taman Tunas Tenang',
      headline: `${student.nama_anak} sedang disiram dengan penuh kasih`,
      narrative:
        'Benih kebiasaan baik baru mulai tumbuh. Isi 7 KAIH di rumah dan pantau catatan guru agar tunas kecil makin kuat.',
    },
    bersemi: {
      label: 'Taman Bunga Bersemi',
      headline: `Langkah ${student.nama_anak} mulai mekar ceria`,
      narrative:
        'Pertumbuhan, literasi, dan hafalan mulai bertaut indah. Sedikit konsistensi harian akan membuat taman belajarnya makin semarak.',
    },
    bersinar: {
      label: 'Taman Belajar Bersinar',
      headline: `MasyaAllah, ${student.nama_anak} tumbuh subur dan ceria!`,
      narrative:
        'Kolaborasi rumah dan sekolah berjalan hangat—fisik sehat, literasi aktif, hafalan terjaga, dan kebiasaan baik terus menyala.',
    },
  };

  const pillars: StoryPillar[] = [
    {
      id: 'fisik',
      step: 1,
      label: 'Tumbuh Fisik',
      statusText: latestAntro ? latestAntro.status_gizi_otomatis : 'Menunggu pengukuran',
      detailText: latestAntro
        ? `BB ${latestAntro.bb_kg} kg · TB ${latestAntro.tb_cm} cm (${latestAntro.periode_bulan})`
        : 'Data berat dan tinggi badan bulan ini belum diinput guru.',
      progressRatio: fisikRatio,
      active: Boolean(latestAntro),
      targetTab: 'perkembangan',
      ctaLabel: 'Lihat grafik pertumbuhan',
    },
    {
      id: 'literasi',
      step: 2,
      label: 'Literasi & Karya',
      statusText:
        dailyLogsCount > 0 || hasLiterasi
          ? `${dailyLogsCount} catatan harian`
          : 'Mulai belajar',
      detailText:
        dailyLogsCount > 0
          ? `${dailyLogsCount} log materi harian${karyaCount > 0 ? ` dan ${karyaCount} hasil karya` : ''} sudah tercatat.`
          : 'Catatan huruf, suku kata, atau karya terbaru dari guru akan muncul di sini.',
      progressRatio: literasiRatio,
      active: hasLiterasi || dailyLogsCount > 0,
      targetTab: 'perkembangan',
      ctaLabel: 'Lihat laporan literasi',
    },
    {
      id: 'keagamaan',
      step: 3,
      label: 'Keagamaan',
      statusText: agamaCount > 0 ? `${agamaCount} materi dinilai` : 'Belum ada capaian',
      detailText:
        agamaCount > 0
          ? `Ananda sudah mencatat ${agamaCount} progres surat pendek, doa, hijaiyah/Iqra, atau hadits.`
          : 'Penilaian surat pendek, doa harian, Iqra, dan hadits akan tercatat oleh guru.',
      progressRatio: agamaRatio,
      active: agamaCount > 0,
      targetTab: 'perkembangan',
      ctaLabel: 'Lihat progres keagamaan',
    },
    {
      id: 'kaih',
      step: 4,
      label: '7 KAIH Rumah',
      statusText: kaihDaysCount > 0 ? `${kaihDaysCount} hari bulan ini` : 'Belum diisi bulan ini',
      detailText:
        kaihDaysCount > 0
          ? `Ayah & Bunda sudah mencatat ${kaihDaysCount} hari kebiasaan baik bulan ini.`
          : 'Ajak ananda centang 7 Kebiasaan Anak Indonesia Hebat hari ini bersama di rumah.',
      progressRatio: kaihRatio,
      active: kaihDaysCount > 0,
      targetTab: 'kaih',
      ctaLabel: 'Isi 7 KAIH hari ini',
    },
  ];

  return {
    stage,
    progressScore,
    stageLabel: stageMeta[stage].label,
    stageHeadline: stageMeta[stage].headline,
    stageNarrative: stageMeta[stage].narrative,
    pillars,
  };
}
