import * as XLSX from 'xlsx';
import { JenisKelamin, MasterKelas, PengaturanSekolah, Siswa } from '../types';
import { inferJenjangFromName } from './kelas';

export const MAX_DAPODIK_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_DAPODIK_ROWS = 1000;

export type DuplicateKind =
  | 'NONE'
  | 'EXISTING_NIS'
  | 'EXISTING_IDENTITY'
  | 'EXISTING_NAME'
  | 'IN_FILE_DUPLICATE';

export interface ParsedDapodikRow {
  rowKey: string;
  sourceRowNumber: number;
  nis: string;
  nama_anak: string;
  jenis_kelamin: JenisKelamin;
  tanggal_lahir: string;
  kelas_asal: string;
  kelas_tujuan: string;
  nama_ortu: string;
  duplicateKind: DuplicateKind;
  duplicateReason: string;
  matchedExisting?: {
    siswa_id: string;
    nama_anak: string;
    nis: string;
    kelas_aktif: string;
  };
  include: boolean;
}

export interface DapodikParseResult {
  sheetName: string;
  rows: ParsedDapodikRow[];
  totalCount: number;
  newCount: number;
  duplicateCount: number;
  truncated: boolean;
}

const INDO_MONTHS: Record<string, string> = {
  januari: '01',
  jan: '01',
  februari: '02',
  feb: '02',
  pebruari: '02',
  maret: '03',
  mar: '03',
  april: '04',
  apr: '04',
  mei: '05',
  juni: '06',
  jun: '06',
  juli: '07',
  jul: '07',
  agustus: '08',
  agu: '08',
  agt: '08',
  september: '09',
  sep: '09',
  sept: '09',
  oktober: '10',
  okt: '10',
  november: '11',
  nov: '11',
  nopember: '11',
  desember: '12',
  des: '12',
};

function cleanCellText(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizeFormulaForExport(val: string | number): string | number {
  if (typeof val === 'number') return val;
  const s = String(val ?? '');
  if (/^[=+\-@\t\r]/.test(s)) {
    return `'${s}`;
  }
  return s;
}

export function normalizeNameKey(name: string): string {
  return cleanCellText(name)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeNisKey(nis: string): string {
  return cleanCellText(nis)
    .toLowerCase()
    .replace(/^'+/, '')
    .replace(/\s+/g, '');
}

function normalizeHeaderText(val: unknown): string {
  return cleanCellText(val)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeGender(val: unknown): JenisKelamin {
  const s = cleanCellText(val).toLowerCase();
  if (s === 'p' || s.startsWith('perempuan') || s.startsWith('wanita') || s === '2' || s === 'pr') {
    return 'P';
  }
  return 'L';
}

function normalizeDate(val: unknown): string {
  if (val instanceof Date && !Number.isNaN(val.getTime())) {
    const y = val.getUTCFullYear();
    const m = String(val.getUTCMonth() + 1).padStart(2, '0');
    const d = String(val.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  if (typeof val === 'number' && Number.isFinite(val) && val > 1000 && val < 90000) {
    const parsed = XLSX.SSF.parse_date_code(val);
    if (parsed && parsed.y && parsed.m && parsed.d) {
      return `${String(parsed.y).padStart(4, '0')}-${String(parsed.m).padStart(2, '0')}-${String(
        parsed.d
      ).padStart(2, '0')}`;
    }
  }

  const s = cleanCellText(val);
  if (!s) return '2021-01-01';

  const isoMatch = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
  }

  const dmyMatch = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
  }

  const indoMatch = s.match(/^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})$/);
  if (indoMatch) {
    const mon = INDO_MONTHS[indoMatch[2].toLowerCase()];
    if (mon) {
      return `${indoMatch[3]}-${mon}-${indoMatch[1].padStart(2, '0')}`;
    }
  }

  return '2021-01-01';
}

function matchClassToMaster(rawClass: string, masterKelas: MasterKelas[]): string {
  const clean = cleanCellText(rawClass);
  const fallback = masterKelas[0]?.nama_kelas || 'Kelas A';
  if (!clean) return fallback;

  const lower = clean.toLowerCase();
  const exact = masterKelas.find((k) => k.nama_kelas.toLowerCase() === lower);
  if (exact) return exact.nama_kelas;

  const partial = masterKelas.find(
    (k) => lower.includes(k.nama_kelas.toLowerCase()) || k.nama_kelas.toLowerCase().includes(lower)
  );
  if (partial) return partial.nama_kelas;

  const inferred = inferJenjangFromName(clean);
  const byJenjang = masterKelas.find((k) => k.jenjang === inferred);
  return byJenjang ? byJenjang.nama_kelas : fallback;
}

interface ColumnMapping {
  headerRowIdx: number;
  namaIdx: number;
  nipdIdx: number;
  nisnIdx: number;
  jkIdx: number;
  tglLahirIdx: number;
  kelasIdx: number;
  ortuIdx: number;
}

function findHeaderRow(matrix: unknown[][]): ColumnMapping | null {
  const maxScan = Math.min(matrix.length, 25);
  for (let r = 0; r < maxScan; r++) {
    const row = matrix[r];
    if (!Array.isArray(row)) continue;
    const headers = row.map(normalizeHeaderText);

    const namaIdx = headers.findIndex(
      (h) =>
        h === 'nama' ||
        h === 'nama lengkap' ||
        h === 'nama peserta didik' ||
        h === 'nama anak' ||
        h === 'nama siswa' ||
        h === 'nama murid'
    );
    if (namaIdx < 0) continue;

    const nipdIdx = headers.findIndex(
      (h) => h === 'nipd' || h === 'nis' || h === 'no induk' || h === 'nomor induk'
    );
    const nisnIdx = headers.findIndex((h) => h === 'nisn');
    const jkIdx = headers.findIndex(
      (h) => h === 'jk' || h === 'jenis kelamin' || h === 'kelamin' || h === 'l p' || h === 'gender'
    );
    const tglLahirIdx = headers.findIndex(
      (h) => h === 'tanggal lahir' || h === 'tgl lahir' || h === 'ttl' || h === 'lahir'
    );
    const kelasIdx = headers.findIndex(
      (h) =>
        h === 'rombel saat ini' ||
        h === 'rombel' ||
        h === 'kelas' ||
        h === 'kelas aktif' ||
        h === 'kelompok'
    );
    const ortuIdx = headers.findIndex(
      (h) =>
        h === 'nama ibu' ||
        h === 'nama ibu kandung' ||
        h === 'nama ayah' ||
        h === 'nama wali' ||
        h === 'orang tua' ||
        h === 'nama orang tua'
    );

    if (nipdIdx >= 0 || nisnIdx >= 0 || jkIdx >= 0 || tglLahirIdx >= 0 || kelasIdx >= 0) {
      return {
        headerRowIdx: r,
        namaIdx,
        nipdIdx,
        nisnIdx,
        jkIdx,
        tglLahirIdx,
        kelasIdx,
        ortuIdx,
      };
    }
  }
  return null;
}

export function parseDapodikExcelBuffer(
  buffer: ArrayBuffer,
  existingSiswa: Siswa[],
  masterKelas: MasterKelas[]
): DapodikParseResult {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: false });
  if (!wb.SheetNames || wb.SheetNames.length === 0) {
    throw new Error('File Excel kosong atau tidak memiliki lembar kerja.');
  }

  let chosenSheet = '';
  let chosenMatrix: unknown[][] = [];
  let mapping: ColumnMapping | null = null;

  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name];
    if (!sheet) continue;
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: '',
      blankrows: false,
    });
    const found = findHeaderRow(matrix);
    if (found) {
      chosenSheet = name;
      chosenMatrix = matrix;
      mapping = found;
      break;
    }
  }

  if (!mapping || !chosenSheet) {
    throw new Error(
      'Kolom data siswa Dapodik tidak ditemukan. Pastikan file memiliki kolom "Nama" serta "NIPD/NIS", "JK", atau "Rombel Saat Ini".'
    );
  }

  const activeExisting = existingSiswa;
  const nisMap = new Map<string, Siswa>();
  const identityMap = new Map<string, Siswa>();
  const nameMap = new Map<string, Siswa>();

  for (const s of activeExisting) {
    const nKey = normalizeNisKey(s.nis);
    if (nKey) nisMap.set(nKey, s);
    const nmKey = normalizeNameKey(s.nama_anak);
    if (nmKey) {
      nameMap.set(nmKey, s);
      identityMap.set(`${nmKey}|${cleanCellText(s.tanggal_lahir)}`, s);
    }
  }

  const seenNisInFile = new Set<string>();
  const seenIdentityInFile = new Set<string>();
  const parsedRows: ParsedDapodikRow[] = [];
  let autoSeq = 1;
  let truncated = false;

  for (let r = mapping.headerRowIdx + 1; r < chosenMatrix.length; r++) {
    const row = chosenMatrix[r];
    if (!Array.isArray(row)) continue;

    const rawNama = cleanCellText(row[mapping.namaIdx]);
    if (!rawNama) continue;
    // Skip repeated Dapodik subheader rows like "Nama" or numeric header markers "1", "2", "3"
    const lowerNama = rawNama.toLowerCase();
    if (lowerNama === 'nama' || lowerNama === 'nama lengkap' || /^\d+$/.test(lowerNama)) {
      continue;
    }

    if (parsedRows.length >= MAX_DAPODIK_ROWS) {
      truncated = true;
      break;
    }

    const rawNipd = mapping.nipdIdx >= 0 ? cleanCellText(row[mapping.nipdIdx]) : '';
    const rawNisn = mapping.nisnIdx >= 0 ? cleanCellText(row[mapping.nisnIdx]) : '';
    const cleanNis = (rawNipd || rawNisn || `DAP-${String(autoSeq++).padStart(3, '0')}`).replace(
      /^'+/,
      ''
    );

    const jk = mapping.jkIdx >= 0 ? normalizeGender(row[mapping.jkIdx]) : 'L';
    const tglLahir =
      mapping.tglLahirIdx >= 0 ? normalizeDate(row[mapping.tglLahirIdx]) : '2021-01-01';
    const kelasAsal = mapping.kelasIdx >= 0 ? cleanCellText(row[mapping.kelasIdx]) : '';
    const kelasTujuan = matchClassToMaster(kelasAsal, masterKelas);
    const namaOrtu = mapping.ortuIdx >= 0 ? cleanCellText(row[mapping.ortuIdx]) : '';

    const nisKey = normalizeNisKey(cleanNis);
    const nmKey = normalizeNameKey(rawNama);
    const idKey = `${nmKey}|${tglLahir}`;

    let duplicateKind: DuplicateKind = 'NONE';
    let duplicateReason = '';
    let matchedExisting: ParsedDapodikRow['matchedExisting'] | undefined;

    const hitByNis = nisKey && !nisKey.startsWith('dap-') ? nisMap.get(nisKey) : undefined;
    const hitByIdentity = nmKey ? identityMap.get(idKey) : undefined;
    const hitByName = nmKey ? nameMap.get(nmKey) : undefined;

    if (hitByNis) {
      duplicateKind = 'EXISTING_NIS';
      duplicateReason = `NIS ${cleanNis} sudah ada di sistem (${hitByNis.nama_anak} · ${hitByNis.kelas_aktif})`;
      matchedExisting = {
        siswa_id: hitByNis.siswa_id,
        nama_anak: hitByNis.nama_anak,
        nis: hitByNis.nis,
        kelas_aktif: hitByNis.kelas_aktif,
      };
    } else if (hitByIdentity) {
      duplicateKind = 'EXISTING_IDENTITY';
      duplicateReason = `Nama & tanggal lahir sudah terdaftar (${hitByIdentity.nama_anak} · NIS ${hitByIdentity.nis})`;
      matchedExisting = {
        siswa_id: hitByIdentity.siswa_id,
        nama_anak: hitByIdentity.nama_anak,
        nis: hitByIdentity.nis,
        kelas_aktif: hitByIdentity.kelas_aktif,
      };
    } else if ((nisKey && seenNisInFile.has(nisKey)) || (nmKey && seenIdentityInFile.has(idKey))) {
      duplicateKind = 'IN_FILE_DUPLICATE';
      duplicateReason = 'Data ganda di dalam file Excel yang diunggah';
    } else if (hitByName) {
      duplicateKind = 'EXISTING_NAME';
      duplicateReason = `Nama sama sudah ada di sistem (${hitByName.nama_anak} · ${hitByName.kelas_aktif}, lahir ${hitByName.tanggal_lahir})`;
      matchedExisting = {
        siswa_id: hitByName.siswa_id,
        nama_anak: hitByName.nama_anak,
        nis: hitByName.nis,
        kelas_aktif: hitByName.kelas_aktif,
      };
    }

    if (nisKey && !nisKey.startsWith('dap-')) seenNisInFile.add(nisKey);
    if (nmKey) seenIdentityInFile.add(idKey);

    parsedRows.push({
      rowKey: `DAPROW-${r}-${parsedRows.length}`,
      sourceRowNumber: r + 1,
      nis: cleanNis,
      nama_anak: rawNama.slice(0, 100),
      jenis_kelamin: jk,
      tanggal_lahir: tglLahir,
      kelas_asal: kelasAsal || '-',
      kelas_tujuan: kelasTujuan,
      nama_ortu: namaOrtu.slice(0, 100),
      duplicateKind,
      duplicateReason,
      matchedExisting,
      include: duplicateKind === 'NONE',
    });
  }

  if (parsedRows.length === 0) {
    throw new Error('Tidak ada baris data murid yang terbaca di bawah header Excel.');
  }

  const duplicateCount = parsedRows.filter((r) => r.duplicateKind !== 'NONE').length;

  return {
    sheetName: chosenSheet,
    rows: parsedRows,
    totalCount: parsedRows.length,
    newCount: parsedRows.length - duplicateCount,
    duplicateCount,
    truncated,
  };
}

export function exportSiswaDapodikExcel(params: {
  siswaList: Siswa[];
  sekolah: PengaturanSekolah;
  filename?: string;
}): void {
  const { siswaList, sekolah, filename } = params;
  const rows: (string | number)[][] = [
    [`DATA PESERTA DIDIK — ${sekolah.nama_sekolah.toUpperCase()}`],
    [`NPSN: ${sekolah.npsn} | Tahun Ajaran: ${sekolah.tahun_ajaran_aktif}`],
    [],
    ['No', 'Nama', 'NIPD', 'JK', 'Tanggal Lahir', 'Rombel Saat Ini', 'Status Siswa', 'Track Literasi'],
    ...siswaList.map((s, idx) => [
      idx + 1,
      sanitizeFormulaForExport(s.nama_anak),
      sanitizeFormulaForExport(s.nis),
      s.jenis_kelamin,
      sanitizeFormulaForExport(s.tanggal_lahir),
      sanitizeFormulaForExport(s.kelas_aktif),
      sanitizeFormulaForExport(s.status_siswa),
      sanitizeFormulaForExport(s.target_literasi_kelas_b || ''),
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 5 },
    { wch: 28 },
    { wch: 14 },
    { wch: 6 },
    { wch: 14 },
    { wch: 18 },
    { wch: 14 },
    { wch: 16 },
  ];
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Peserta Didik');
  const safeTa = sekolah.tahun_ajaran_aktif.replace(/[^a-zA-Z0-9]+/g, '_');
  XLSX.writeFile(wb, filename || `Data_Siswa_Dapodik_${safeTa}.xlsx`);
}

export function downloadDapodikTemplateExcel(masterKelas: MasterKelas[]): void {
  const firstClass = masterKelas[0]?.nama_kelas || 'Kelas A';
  const secondClass = masterKelas[1]?.nama_kelas || firstClass;

  const rows: (string | number)[][] = [
    ['Daftar Peserta Didik (Format Kompatibel Dapodik)'],
    ['Isi atau tempel data murid mulai baris ke-4. Kolom wajib: Nama, NIPD/NIS, JK, Tanggal Lahir, Rombel Saat Ini.'],
    [],
    ['No', 'Nama', 'NIPD', 'JK', 'Tanggal Lahir', 'Rombel Saat Ini', 'Nama Ibu'],
    [1, 'Contoh: Ahmad Fauzan', '2026101', 'L', '2021-05-14', firstClass, 'Ibu Siti'],
    [2, 'Contoh: Zahra Aulia', '2026102', 'P', '2020-08-22', secondClass, 'Ibu Fatimah'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 5 },
    { wch: 26 },
    { wch: 14 },
    { wch: 6 },
    { wch: 15 },
    { wch: 18 },
    { wch: 20 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Peserta Didik');
  XLSX.writeFile(wb, 'Template_Import_Siswa_Dapodik.xlsx');
}
