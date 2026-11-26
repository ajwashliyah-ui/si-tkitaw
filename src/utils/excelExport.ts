import * as XLSX from 'xlsx';
import { AttendanceRekapRow } from './attendance';
import { PengaturanSekolah } from '../types';

export function exportAttendanceToExcel(params: {
  rows: AttendanceRekapRow[];
  sekolah: PengaturanSekolah;
  periodeLabel: string;
  kelasLabel: string;
  filename: string;
}) {
  const { rows, sekolah, periodeLabel, kelasLabel, filename } = params;

  const totalH = rows.reduce((a, r) => a + r.hadir, 0);
  const totalS = rows.reduce((a, r) => a + r.sakit, 0);
  const totalI = rows.reduce((a, r) => a + r.izin, 0);
  const totalA = rows.reduce((a, r) => a + r.alpa, 0);
  const totalEfektif = rows.reduce((a, r) => a + r.totalHariEfektif, 0);
  const avgPct = totalEfektif > 0 ? Math.round((totalH / totalEfektif) * 100) : 0;

  const sheetData: (string | number)[][] = [
    [`REKAP DAFTAR HADIR ${sekolah.nama_sekolah.toUpperCase()}`],
    [`NPSN: ${sekolah.npsn} | ${sekolah.alamat_sekolah}`],
    [`Periode: ${periodeLabel} | Kelas: ${kelasLabel} | Tahun Ajaran: ${sekolah.tahun_ajaran_aktif}`],
    [],
    ['No', 'NIS', 'Nama Anak', 'Kelas', 'H (Hadir)', 'S (Sakit)', 'I (Izin)', 'A (Alpa)', 'Total Hari Efektif', '% Kehadiran'],
    ...rows.map((r) => [
      r.no,
      r.nis,
      r.nama_anak,
      r.kelas,
      r.hadir,
      r.sakit,
      r.izin,
      r.alpa,
      r.totalHariEfektif,
      `${r.persenKehadiran}%`,
    ]),
    ['TOTAL', '', `${rows.length} Siswa`, kelasLabel, totalH, totalS, totalI, totalA, totalEfektif, `${avgPct}%`],
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 28 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 18 },
    { wch: 14 },
  ];
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 9 } },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Rekap Daftar Hadir');
  XLSX.writeFile(wb, filename);
}
