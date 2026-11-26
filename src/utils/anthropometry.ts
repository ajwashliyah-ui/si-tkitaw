import { JenisKelamin } from '../types';

export interface AnthropometryEvaluation {
  statusGizi: 'Normal' | 'BB Kurang' | 'BB Lebih' | 'TB Pendek' | 'LiLA/LK Perlu Perhatian';
  kodePemicuTips:
    | 'ANTRO_NORMAL'
    | 'ANTRO_BB_KURANG'
    | 'ANTRO_BB_LEBIH'
    | 'ANTRO_TB_PENDEK'
    | 'ANTRO_LILA_LK_PERHATIAN'
    | 'ANTRO_TREN_STAGNAN';
  isStagnant: boolean;
  summaryNote: string;
}

export function calculateAgeInMonths(birthDateStr: string, referenceDateStr: string): number {
  const birth = new Date(birthDateStr);
  const ref = new Date(referenceDateStr);
  if (Number.isNaN(birth.getTime()) || Number.isNaN(ref.getTime())) {
    return 48;
  }
  let months = (ref.getFullYear() - birth.getFullYear()) * 12 + (ref.getMonth() - birth.getMonth());
  if (ref.getDate() < birth.getDate()) {
    months -= 1;
  }
  return Math.max(0, months);
}

/**
 * Simplified WHO/Kemenkes anthropometric reference for ages 36–78 months (PAUD).
 */
export function evaluateAnthropometry(params: {
  usiaBulan: number;
  jenisKelamin: JenisKelamin;
  bbKg: number;
  tbCm: number;
  lkCm: number;
  lilaCm: number;
  prevBbKg?: number;
  prevTbCm?: number;
}): AnthropometryEvaluation {
  const { usiaBulan, jenisKelamin, bbKg, tbCm, lkCm, lilaCm, prevBbKg, prevTbCm } = params;

  // Approximate WHO median BB & TB for 3-6.5 years (36-78 months)
  const years = Math.max(3, Math.min(7, usiaBulan / 12));
  const genderOffsetBb = jenisKelamin === 'L' ? 0.3 : -0.2;
  const genderOffsetTb = jenisKelamin === 'L' ? 0.8 : -0.5;

  const expectedBb = 8.5 + years * 2.0 + genderOffsetBb; // ~16.5kg at 4y, ~18.5kg at 5y, ~20.5kg at 6y
  const expectedTb = 78.0 + years * 6.4 + genderOffsetTb; // ~103.6cm at 4y, ~110cm at 5y, ~116.4cm at 6y

  const isStagnant =
    typeof prevBbKg === 'number' &&
    typeof prevTbCm === 'number' &&
    bbKg <= prevBbKg &&
    tbCm - prevTbCm < 0.3;

  // Priority checks
  if (lilaCm > 0 && lilaCm < 13.5) {
    return {
      statusGizi: 'LiLA/LK Perlu Perhatian',
      kodePemicuTips: 'ANTRO_LILA_LK_PERHATIAN',
      isStagnant,
      summaryNote: 'Lingkar lengan atas berada di bawah batas nyaman PAUD (< 13.5 cm).',
    };
  }
  if (lkCm > 0 && (lkCm < 46.5 || lkCm > 55.5)) {
    return {
      statusGizi: 'LiLA/LK Perlu Perhatian',
      kodePemicuTips: 'ANTRO_LILA_LK_PERHATIAN',
      isStagnant,
      summaryNote: 'Lingkar kepala berada di luar rentang acuan umum usia PAUD.',
    };
  }
  if (tbCm > 0 && tbCm < expectedTb - 7.5) {
    return {
      statusGizi: 'TB Pendek',
      kodePemicuTips: 'ANTRO_TB_PENDEK',
      isStagnant,
      summaryNote: 'Tinggi badan di bawah rentang acuan usia; perkuat protein hewani & tidur cukup.',
    };
  }
  if (bbKg > 0 && bbKg < expectedBb - 2.3) {
    return {
      statusGizi: 'BB Kurang',
      kodePemicuTips: isStagnant ? 'ANTRO_TREN_STAGNAN' : 'ANTRO_BB_KURANG',
      isStagnant,
      summaryNote: isStagnant
        ? 'Berat badan kurang dan tren bulan ini mendatar dibanding bulan sebelumnya.'
        : 'Berat badan berada di bawah rentang acuan usia.',
    };
  }
  if (bbKg > expectedBb + 4.2) {
    return {
      statusGizi: 'BB Lebih',
      kodePemicuTips: 'ANTRO_BB_LEBIH',
      isStagnant,
      summaryNote: 'Berat badan di atas rentang acuan usia; anjurkan aktivitas fisik aktif.',
    };
  }
  if (isStagnant) {
    return {
      statusGizi: 'Normal',
      kodePemicuTips: 'ANTRO_TREN_STAGNAN',
      isStagnant: true,
      summaryNote: 'Status gizi masih normal namun kenaikan BB & TB bulan ini cenderung mendatar.',
    };
  }

  return {
    statusGizi: 'Normal',
    kodePemicuTips: 'ANTRO_NORMAL',
    isStagnant: false,
    summaryNote: 'Pertumbuhan berat, tinggi, lingkar kepala, dan LiLA berada dalam rentang normal.',
  };
}
