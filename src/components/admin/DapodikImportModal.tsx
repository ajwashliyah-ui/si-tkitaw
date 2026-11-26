import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CheckSquare,
  Download,
  FileSpreadsheet,
  Square,
  Upload,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { RiwayatKelas, Siswa } from '../../types';
import {
  DapodikParseResult,
  MAX_DAPODIK_FILE_BYTES,
  ParsedDapodikRow,
  downloadDapodikTemplateExcel,
  parseDapodikExcelBuffer,
} from '../../utils/dapodikImport';
import { getMasterKelasList } from '../../utils/kelas';

interface DapodikImportModalProps {
  onClose: () => void;
}

export const DapodikImportModal: React.FC<DapodikImportModalProps> = ({ onClose }) => {
  const { db, updateDb, addToast, triggerCelebration } = useApp();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const kelasList = useMemo(() => getMasterKelasList(db), [db]);
  const activeTa = useMemo(
    () => db.tahunAjaran.find((t) => t.status_aktif) || db.tahunAjaran[0],
    [db.tahunAjaran]
  );

  const [fileName, setFileName] = useState<string>('');
  const [parseResult, setParseResult] = useState<DapodikParseResult | null>(null);
  const [rows, setRows] = useState<ParsedDapodikRow[]>([]);
  const [parseError, setParseError] = useState<string>('');
  const [defaultKelas, setDefaultKelas] = useState<string>(
    () => kelasList[0]?.nama_kelas || 'Kelas A'
  );
  const [importing, setImporting] = useState<boolean>(false);

  const handleFileSelected = async (file?: File) => {
    if (!file) return;
    setParseError('');

    const extOk = /\.(xlsx|xls|csv)$/i.test(file.name);
    if (!extOk) {
      setParseError('Format file harus .xlsx, .xls, atau .csv hasil unduhan Dapodik.');
      return;
    }
    if (file.size > MAX_DAPODIK_FILE_BYTES) {
      setParseError('Ukuran file maksimal 5 MB.');
      return;
    }

    try {
      const buf = await file.arrayBuffer();
      const parsed = parseDapodikExcelBuffer(buf, db.siswa, kelasList);
      setFileName(file.name);
      setParseResult(parsed);
      setRows(parsed.rows);
    } catch (err) {
      setParseResult(null);
      setRows([]);
      setParseError(
        err instanceof Error ? err.message : 'File Excel tidak dapat dibaca.'
      );
    }
  };

  const includedRows = useMemo(() => rows.filter((r) => r.include), [rows]);
  const duplicateRows = useMemo(
    () => rows.filter((r) => r.duplicateKind !== 'NONE'),
    [rows]
  );
  const includedDuplicateCount = useMemo(
    () => duplicateRows.filter((r) => r.include).length,
    [duplicateRows]
  );
  const skippedDuplicateCount = duplicateRows.length - includedDuplicateCount;

  const toggleRowInclude = (rowKey: string) => {
    setRows((prev) =>
      prev.map((r) => (r.rowKey === rowKey ? { ...r, include: !r.include } : r))
    );
  };

  const setRowKelas = (rowKey: string, nextKelas: string) => {
    setRows((prev) =>
      prev.map((r) => (r.rowKey === rowKey ? { ...r, kelas_tujuan: nextKelas } : r))
    );
  };

  const handleSkipAllDuplicates = () => {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        include: r.duplicateKind === 'NONE',
      }))
    );
    addToast('Semua data ganda ditandai untuk tidak dimasukkan.', 'info');
  };

  const handleApplyDefaultClassToAll = () => {
    setRows((prev) => prev.map((r) => ({ ...r, kelas_tujuan: defaultKelas })));
    addToast(`Semua baris diarahkan ke ${defaultKelas}.`, 'info');
  };

  const handleConfirmImport = async () => {
    if (includedRows.length === 0) {
      addToast('Tidak ada data murid baru yang dipilih untuk dimasukkan.', 'error');
      return;
    }

    setImporting(true);
    const nowBase = Date.now();
    const newStudents: Siswa[] = [];
    const newRiwayat: RiwayatKelas[] = [];

    const waliMap = new Map(
      db.users
        .filter((u) => u.role === 'Guru' && u.kelas_ampu)
        .map((u) => [u.kelas_ampu as string, u.user_id])
    );

    includedRows.forEach((row, idx) => {
      const siswaId = `SIS-${nowBase.toString().slice(-5)}-${idx + 1}`;
      newStudents.push({
        siswa_id: siswaId,
        nis: row.nis,
        nama_anak: row.nama_anak,
        jenis_kelamin: row.jenis_kelamin,
        tanggal_lahir: row.tanggal_lahir,
        ortu_user_id: '',
        kelas_aktif: row.kelas_tujuan,
        status_siswa: 'Aktif',
        target_literasi_kelas_b: 'TRACK_1',
        keputusan_kenaikan: 'BELUM_DITENTUKAN',
      });

      if (activeTa) {
        newRiwayat.push({
          riwayat_id: `RWY-${nowBase}-${idx + 1}`,
          siswa_id: siswaId,
          ta_id: activeTa.ta_id,
          nama_ta: activeTa.nama_ta,
          kelas: row.kelas_tujuan,
          wali_kelas_id: waliMap.get(row.kelas_tujuan) || '',
          status_akhir: 'Berjalan',
          catatan: 'Import Excel Dapodik',
        });
      }
    });

    await updateDb(
      (prev) => ({
        ...prev,
        siswa: [...prev.siswa, ...newStudents],
        riwayatKelas: [...prev.riwayatKelas, ...newRiwayat],
      }),
      skippedDuplicateCount > 0
        ? `${newStudents.length} murid baru dari Dapodik berhasil dimasukkan (${skippedDuplicateCount} data ganda dilewati).`
        : `${newStudents.length} murid baru dari Dapodik berhasil dimasukkan.`
    );

    setImporting(false);
    triggerCelebration(`${newStudents.length} murid ditambahkan!`);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b1f14]/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="judul-import-dapodik"
      onClick={(e) => {
        if (e.target === e.currentTarget && !importing) onClose();
      }}
    >
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col bg-[#fffdf7] rounded-[26px] border border-[#d9d5c0] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-[#d9d5c0] bg-[#fbf6e7]">
          <div>
            <h2
              id="judul-import-dapodik"
              className="text-xl text-[#0f4527] inline-flex items-center gap-2 m-0"
            >
              <FileSpreadsheet className="w-5 h-5 text-[#176238]" />
              <span>Import data murid dari Excel Dapodik</span>
            </h2>
            <p className="text-xs text-[#55665a] mt-1 m-0">
              Unggah file Excel peserta didik dari Dapodik (.xlsx / .xls / .csv). Data ganda otomatis dideteksi agar bisa dilewati sebelum masuk ke sistem.
            </p>
          </div>
          <button
            type="button"
            disabled={importing}
            onClick={onClose}
            aria-label="Tutup dialog"
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#55665a] hover:bg-[#dcebd2] cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* File Picker Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border-2 border-dashed border-[#176238]/40 bg-[#dcebd2]/25">
            <div className="space-y-1">
              <p className="text-sm font-bold text-[#0f4527] m-0">
                {fileName ? `File dipilih: ${fileName}` : 'Pilih file Excel Dapodik peserta didik'}
              </p>
              <p className="text-xs text-[#55665a] m-0">
                Mendukung kolom Dapodik (Nama, NIPD/NIS, NISN, JK, Tanggal Lahir, Rombel Saat Ini).
                {parseResult ? ` · Lembar: "${parseResult.sheetName}"` : ''}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => downloadDapodikTemplateExcel(kelasList)}
                className="tbl polos kecil"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh contoh format</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="tbl kecil"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{fileName ? 'Ganti file Excel' : 'Pilih file Excel'}</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  void handleFileSelected(file);
                  e.target.value = '';
                }}
              />
            </div>
          </div>

          {parseError && (
            <div className="p-3.5 rounded-xl bg-[#f8dcd6] border border-[#e3a396] text-xs text-[#7a2515] font-semibold flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{parseError}</span>
            </div>
          )}

          {parseResult && (
            <>
              {/* Ringkasan & Peringatan Data Ganda */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-[#fbf6e7] border border-[#d9d5c0]">
                  <p className="text-[11px] text-[#55665a] font-bold m-0">Total terbaca</p>
                  <p className="text-xl font-bold text-[#1d2b21] font-mono-tabular mt-0.5 m-0">
                    {parseResult.totalCount} baris
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-[#dcebd2]/65 border border-[#b7d3a8]">
                  <p className="text-[11px] text-[#0f4527] font-bold m-0">Data baru siap masuk</p>
                  <p className="text-xl font-bold text-[#0f4527] font-mono-tabular mt-0.5 m-0">
                    {includedRows.length} anak
                  </p>
                </div>
                <div
                  className={`p-3 rounded-xl border ${
                    duplicateRows.length > 0
                      ? 'bg-[#fdeab5]/80 border-[#f2b632]'
                      : 'bg-[#fbf6e7] border-[#d9d5c0]'
                  }`}
                >
                  <p className="text-[11px] text-[#7c4d03] font-bold m-0">Peringatan data ganda</p>
                  <p className="text-xl font-bold text-[#7c4d03] font-mono-tabular mt-0.5 m-0">
                    {duplicateRows.length} data
                  </p>
                </div>
              </div>

              {duplicateRows.length > 0 && (
                <div className="p-4 rounded-2xl bg-[#fdeab5]/65 border border-[#f2b632] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5 text-xs text-[#7c4d03]">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#b45309]" />
                    <div className="space-y-0.5">
                      <p className="font-extrabold m-0">
                        Peringatan: Ditemukan {duplicateRows.length} data ganda (double data)!
                      </p>
                      <p className="m-0 leading-relaxed">
                        Baris yang sudah ada di sistem atau berulang di file otomatis{' '}
                        <strong>tidak dicentang</strong> agar tidak masuk ganda. Centang manual hanya jika memang ingin tetap dimasukkan.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSkipAllDuplicates}
                    className="tbl polos kecil shrink-0"
                  >
                    Abaikan semua data ganda
                  </button>
                </div>
              )}

              {parseResult.truncated && (
                <p className="text-xs text-[#7c4d03] m-0">
                  Menampilkan 1.000 baris pertama dari file Excel.
                </p>
              )}

              {/* Kontrol Kelas Default */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-[#fbf6e7] border border-[#d9d5c0] text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-[#0f4527]">Ubah kelas massal:</span>
                  <select
                    aria-label="Pilih kelas default untuk semua baris"
                    value={defaultKelas}
                    onChange={(e) => setDefaultKelas(e.target.value)}
                    className="isian-kontrol min-h-[34px] py-1 text-xs w-auto"
                  >
                    {kelasList.map((k) => (
                      <option key={k.kelas_id} value={k.nama_kelas}>
                        {k.nama_kelas}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleApplyDefaultClassToAll}
                    className="tbl polos kecil"
                  >
                    Terapkan ke semua baris
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setRows((prev) => prev.map((r) => ({ ...r, include: true })))}
                    className="font-bold text-[#176238] hover:underline cursor-pointer"
                  >
                    Centang semua
                  </button>
                  <button
                    type="button"
                    onClick={() => setRows((prev) => prev.map((r) => ({ ...r, include: false })))}
                    className="font-bold text-[#a33a25] hover:underline cursor-pointer"
                  >
                    Kosongkan semua
                  </button>
                </div>
              </div>

              {/* Tabel Pratinjau */}
              <div className="geser rounded-2xl border border-[#d9d5c0] bg-white">
                <table className="tabel-bersih text-xs">
                  <thead>
                    <tr>
                      <th className="w-10">Pilih</th>
                      <th>Nama anak</th>
                      <th>NIS / NIPD</th>
                      <th>JK &amp; Tgl lahir</th>
                      <th>Kelas tujuan</th>
                      <th>Status pengecekan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const isDup = r.duplicateKind !== 'NONE';
                      return (
                        <tr
                          key={r.rowKey}
                          className={
                            isDup
                              ? r.include
                                ? 'bg-[#fdeab5]/40'
                                : 'bg-[#f8dcd6]/35 opacity-85'
                              : r.include
                              ? 'bg-[#dcebd2]/20'
                              : 'opacity-65'
                          }
                        >
                          <td>
                            <button
                              type="button"
                              onClick={() => toggleRowInclude(r.rowKey)}
                              aria-label={`${r.include ? 'Batalkan' : 'Masukkan'} ${r.nama_anak}`}
                              className="p-1 text-[#176238] cursor-pointer"
                            >
                              {r.include ? (
                                <CheckSquare className="w-4 h-4" />
                              ) : (
                                <Square className="w-4 h-4 text-[#55665a]" />
                              )}
                            </button>
                          </td>
                          <td>
                            <p className="font-bold text-[#1d2b21] m-0">{r.nama_anak}</p>
                            {r.nama_ortu && (
                              <p className="text-[11px] text-[#55665a] m-0">Ortu: {r.nama_ortu}</p>
                            )}
                          </td>
                          <td className="font-mono-tabular font-semibold">{r.nis}</td>
                          <td className="font-mono-tabular whitespace-nowrap">
                            {r.jenis_kelamin} · {r.tanggal_lahir}
                          </td>
                          <td>
                            <select
                              aria-label={`Kelas tujuan ${r.nama_anak}`}
                              value={r.kelas_tujuan}
                              onChange={(e) => setRowKelas(r.rowKey, e.target.value)}
                              className="isian-kontrol min-h-[32px] py-1 text-xs w-auto max-w-[150px]"
                            >
                              {kelasList.map((k) => (
                                <option key={k.kelas_id} value={k.nama_kelas}>
                                  {k.nama_kelas}
                                </option>
                              ))}
                            </select>
                            {r.kelas_asal !== '-' && r.kelas_asal !== r.kelas_tujuan && (
                              <p className="text-[10px] text-[#55665a] mt-0.5 m-0">
                                Asal Dapodik: {r.kelas_asal}
                              </p>
                            )}
                          </td>
                          <td>
                            {isDup ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#fdeab5] text-[#7c4d03] font-extrabold text-[10px]">
                                  <AlertTriangle className="w-3 h-3" />
                                  {r.include ? 'Data ganda (tetap dimasukkan)' : 'Data ganda (dilewati)'}
                                </span>
                                <p className="text-[11px] text-[#7a2515] m-0 leading-snug">
                                  {r.duplicateReason}
                                </p>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#dcebd2] text-[#0f4527] font-extrabold text-[10px]">
                                <CheckCircle2 className="w-3 h-3" />
                                {r.include ? 'Data baru' : 'Dilewati manual'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-[#d9d5c0] bg-[#fbf6e7]">
          <p className="text-xs text-[#55665a] m-0">
            {parseResult
              ? `${includedRows.length} siswa akan dimasukkan${
                  skippedDuplicateCount > 0
                    ? ` · ${skippedDuplicateCount} data ganda dikonfirmasi tidak dimasukkan`
                    : ''
                }.`
              : 'Belum ada file yang diunggah.'}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={importing}
              onClick={onClose}
              className="tbl polos"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={importing || includedRows.length === 0}
              onClick={handleConfirmImport}
              className="tbl"
            >
              {importing
                ? 'Menyimpan...'
                : `Konfirmasi & Masukkan ${includedRows.length} Siswa`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
