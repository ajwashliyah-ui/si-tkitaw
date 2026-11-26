import React, { useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DaftarHadirRecord, KelasType, SemesterType, StatusAbsensi } from '../../types';
import { computeAttendanceRekap, getSemesterFromMonth } from '../../utils/attendance';
import { exportAttendanceToExcel } from '../../utils/excelExport';
import { GuruSpiritBanner } from '../common/StickerCelebration';

const STATUS_OPTIONS: { value: StatusAbsensi; label: string; activeClass: string }[] = [
  { value: 'HADIR', label: 'Hadir', activeClass: 'bg-[#176238] text-white border-[#176238]' },
  { value: 'SAKIT', label: 'Sakit', activeClass: 'bg-[#d97706] text-white border-[#d97706]' },
  { value: 'IZIN', label: 'Izin', activeClass: 'bg-[#2f5f9e] text-white border-[#2f5f9e]' },
  { value: 'ALPA', label: 'Alpa', activeClass: 'bg-[#a33a25] text-white border-[#a33a25]' },
];

export const DaftarHadirView: React.FC = () => {
  const { db, currentUser, schoolInfo, updateDb, triggerCelebration } = useApp();

  const [subTab, setSubTab] = useState<'input' | 'rekap_bulanan' | 'rekap_semester'>('input');
  const [tanggal, setTanggal] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [kelasFilter, setKelasFilter] = useState<'Semua Kelas' | KelasType>(() =>
    currentUser?.role === 'Guru' && currentUser.kelas_ampu ? currentUser.kelas_ampu : 'Semua Kelas'
  );

  const [statusMap, setStatusMap] = useState<Record<string, StatusAbsensi>>({});

  const [rekapBulan, setRekapBulan] = useState<string>('2026-11');
  const [rekapSemester, setRekapSemester] = useState<SemesterType>('Semester 1');
  const [rekapTaId, setRekapTaId] = useState<string>(
    () => db.tahunAjaran.find((t) => t.status_aktif)?.ta_id || 'TA-2026-2027'
  );

  const filteredStudents = useMemo(() => {
    return db.siswa.filter((s) => {
      if (s.status_siswa !== 'Aktif') return false;
      if (kelasFilter !== 'Semua Kelas') return s.kelas_aktif === kelasFilter;
      return true;
    });
  }, [db.siswa, kelasFilter]);

  useEffect(() => {
    const next: Record<string, StatusAbsensi> = {};
    for (const s of filteredStudents) {
      const existing = db.daftarHadir.find(
        (d) => d.tanggal === tanggal && d.siswa_id === s.siswa_id
      );
      next[s.siswa_id] = existing ? existing.status : 'HADIR';
    }
    setStatusMap(next);
  }, [tanggal, filteredStudents, db.daftarHadir]);

  const handleSaveAbsensi = async () => {
    const activeTa = db.tahunAjaran.find((t) => t.status_aktif)?.ta_id || 'TA-2026-2027';
    const monthNum = Number(tanggal.split('-')[1] || '11');
    const periodeBulan = tanggal.slice(0, 7);
    const semester = getSemesterFromMonth(monthNum);
    const now = new Date().toISOString();

    await updateDb((prev) => {
      const remaining = prev.daftarHadir.filter(
        (row) =>
          !(
            row.tanggal === tanggal &&
            filteredStudents.some((st) => st.siswa_id === row.siswa_id)
          )
      );
      const newRows: DaftarHadirRecord[] = filteredStudents.map((st) => ({
        absen_id: `ABS-${tanggal.replace(/-/g, '')}-${st.siswa_id}`,
        tanggal,
        periode_bulan: periodeBulan,
        semester,
        ta_id: activeTa,
        siswa_id: st.siswa_id,
        nama_anak: st.nama_anak,
        kelas: st.kelas_aktif === 'Kelas B' ? 'Kelas B' : 'Kelas A',
        status: statusMap[st.siswa_id] || 'HADIR',
        diinput_oleh: currentUser?.nama_lengkap || 'Guru',
        updated_at: now,
      }));
      return {
        ...prev,
        daftarHadir: [...remaining, ...newRows],
      };
    }, 'Tersimpan');
    triggerCelebration(`Daftar hadir ${filteredStudents.length} anak tersimpan!`);
  };

  const rekapRows = useMemo(() => {
    return computeAttendanceRekap(db.siswa, db.daftarHadir, {
      mode: subTab === 'rekap_semester' ? 'semester' : 'bulanan',
      periodeBulan: rekapBulan,
      semester: rekapSemester,
      taId: rekapTaId,
      kelasFilter,
    });
  }, [db.siswa, db.daftarHadir, subTab, rekapBulan, rekapSemester, rekapTaId, kelasFilter]);

  const handleDownloadExcel = () => {
    const periodeLabel =
      subTab === 'rekap_bulanan'
        ? `Bulan ${rekapBulan}`
        : `${rekapSemester} (${db.tahunAjaran.find((t) => t.ta_id === rekapTaId)?.nama_ta || ''})`;
    const safeFilename = `Rekap_Daftar_Hadir_${kelasFilter.replace(/\s+/g, '_')}_${
      subTab === 'rekap_bulanan' ? rekapBulan : rekapSemester.replace(/\s+/g, '_')
    }.xlsx`;

    exportAttendanceToExcel({
      rows: rekapRows,
      sekolah: schoolInfo,
      periodeLabel,
      kelasLabel: kelasFilter,
      filename: safeFilename,
    });
  };

  const recordedTodayCount = useMemo(() => {
    const ids = new Set(
      db.daftarHadir.filter((d) => d.tanggal === tanggal).map((d) => d.siswa_id)
    );
    return filteredStudents.filter((s) => ids.has(s.siswa_id)).length;
  }, [db.daftarHadir, filteredStudents, tanggal]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl text-[#0f4527]">Daftar hadir</h1>
          <p className="text-sm text-[#55665a]">
            Catat kehadiran harian anak dan unduh rekap bulanan maupun semester dalam format Excel.
          </p>
        </div>

        <div className="tab-bar self-start xl:self-auto">
          <button
            type="button"
            onClick={() => setSubTab('input')}
            className={`tab-btn ${subTab === 'input' ? 'aktif' : ''}`}
          >
            Harian
          </button>
          <button
            type="button"
            onClick={() => setSubTab('rekap_bulanan')}
            className={`tab-btn ${subTab === 'rekap_bulanan' ? 'aktif' : ''}`}
          >
            Rekap bulanan
          </button>
          <button
            type="button"
            onClick={() => setSubTab('rekap_semester')}
            className={`tab-btn ${subTab === 'rekap_semester' ? 'aktif' : ''}`}
          >
            Rekap semester
          </button>
        </div>
      </div>

      {subTab === 'input' && (
        <GuruSpiritBanner
          done={recordedTodayCount}
          total={filteredStudents.length}
          titleProgress={`${recordedTodayCount} dari ${filteredStudents.length} anak sudah diabsen tanggal ${tanggal}`}
          titleDone={`Alhamdulillah! Absensi ${filteredStudents.length} anak tanggal ${tanggal} sudah lengkap`}
        />
      )}

      {subTab === 'input' ? (
        <div className="kartu space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <label className="block">
              <span className="block font-extrabold text-xs mb-1">Tanggal</span>
              <input
                id="absen-tanggal"
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="isian-kontrol font-mono-tabular"
              />
            </label>

            <label className="block">
              <span className="block font-extrabold text-xs mb-1">Kelas</span>
              <select
                id="absen-kelas"
                value={kelasFilter}
                onChange={(e) => setKelasFilter(e.target.value as 'Semua Kelas' | KelasType)}
                className="isian-kontrol"
              >
                <option value="Semua Kelas">Semua kelas</option>
                <option value="Kelas A">Kelas A</option>
                <option value="Kelas B">Kelas B</option>
              </select>
            </label>

            <button
              type="button"
              onClick={handleSaveAbsensi}
              className="tbl"
            >
              Simpan daftar hadir
            </button>
          </div>

          <ul className="daftar border-t border-[#d9d5c0] pt-2">
            {filteredStudents.map((st, idx) => {
              const current = statusMap[st.siswa_id] || 'HADIR';
              return (
                <li key={st.siswa_id}>
                  <div>
                    <strong className="text-sm text-[#1d2b21]">
                      {idx + 1}. {st.nama_anak}
                    </strong>
                    <small className="text-xs text-[#55665a] font-mono-tabular block">
                      NIS {st.nis} · {st.kelas_aktif}
                    </small>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label={`Status hadir ${st.nama_anak}`}>
                    {STATUS_OPTIONS.map((opt) => {
                      const active = current === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() =>
                            setStatusMap((prev) => ({ ...prev, [st.siswa_id]: opt.value }))
                          }
                          className={`min-h-[42px] px-3 rounded-[14px] border-2 text-xs font-bold transition-colors cursor-pointer ${
                            active
                              ? `${opt.activeClass} cap-pop`
                              : 'bg-white border-[#d9d5c0] text-[#55665a] hover:border-[#176238]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="kartu space-y-5">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
              {subTab === 'rekap_bulanan' ? (
                <label className="block">
                  <span className="block font-extrabold text-xs mb-1">Bulan</span>
                  <input
                    id="rekap-bulan"
                    type="month"
                    value={rekapBulan}
                    onChange={(e) => setRekapBulan(e.target.value)}
                    className="isian-kontrol font-mono-tabular"
                  />
                </label>
              ) : (
                <>
                  <label className="block">
                    <span className="block font-extrabold text-xs mb-1">Semester</span>
                    <select
                      id="rekap-sem"
                      value={rekapSemester}
                      onChange={(e) => setRekapSemester(e.target.value as SemesterType)}
                      className="isian-kontrol"
                    >
                      <option value="Semester 1">Semester 1 (Juli–Desember)</option>
                      <option value="Semester 2">Semester 2 (Januari–Juni)</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="block font-extrabold text-xs mb-1">Tahun ajaran</span>
                    <select
                      id="rekap-ta"
                      value={rekapTaId}
                      onChange={(e) => setRekapTaId(e.target.value)}
                      className="isian-kontrol"
                    >
                      {db.tahunAjaran.map((ta) => (
                        <option key={ta.ta_id} value={ta.ta_id}>
                          {ta.nama_ta}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}

              <label className="block">
                <span className="block font-extrabold text-xs mb-1">Kelas</span>
                <select
                  id="rekap-kelas"
                  value={kelasFilter}
                  onChange={(e) => setKelasFilter(e.target.value as 'Semua Kelas' | KelasType)}
                  className="isian-kontrol"
                >
                  <option value="Semua Kelas">Semua kelas</option>
                  <option value="Kelas A">Kelas A</option>
                  <option value="Kelas B">Kelas B</option>
                </select>
              </label>
            </div>

            <button
              type="button"
              onClick={handleDownloadExcel}
              className="tbl"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Excel (.xlsx)</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#d9d5c0] text-xs text-[#55665a]">
                  <th className="py-2.5 px-2">No</th>
                  <th className="py-2.5 px-2">NIS</th>
                  <th className="py-2.5 px-2">Nama anak</th>
                  <th className="py-2.5 px-2">Kelas</th>
                  <th className="py-2.5 px-2 text-right">H</th>
                  <th className="py-2.5 px-2 text-right">S</th>
                  <th className="py-2.5 px-2 text-right">I</th>
                  <th className="py-2.5 px-2 text-right">A</th>
                  <th className="py-2.5 px-2 text-right">Efektif</th>
                  <th className="py-2.5 px-2 text-right">% Hadir</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {rekapRows.map((row) => (
                  <tr key={row.siswa_id} className="border-b border-[#d9d5c0]">
                    <td className="py-2.5 px-2 text-[#55665a]">{row.no}</td>
                    <td className="py-2.5 px-2 font-mono-tabular text-xs text-[#55665a]">{row.nis}</td>
                    <td className="py-2.5 px-2 font-bold text-[#1d2b21]">{row.nama_anak}</td>
                    <td className="py-2.5 px-2 text-[#55665a]">{row.kelas}</td>
                    <td className="py-2.5 px-2 text-right font-bold text-[#176238]">{row.hadir}</td>
                    <td className="py-2.5 px-2 text-right font-bold text-[#d97706]">{row.sakit}</td>
                    <td className="py-2.5 px-2 text-right font-bold text-[#2f5f9e]">{row.izin}</td>
                    <td className="py-2.5 px-2 text-right font-bold text-[#a33a25]">{row.alpa}</td>
                    <td className="py-2.5 px-2 text-right text-[#1d2b21]">{row.totalHariEfektif}</td>
                    <td className="py-2.5 px-2 text-right font-bold text-[#1d2b21]">
                      {row.persenKehadiran}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
