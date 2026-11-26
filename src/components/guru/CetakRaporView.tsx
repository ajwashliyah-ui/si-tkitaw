import React, { useMemo, useState } from 'react';
import { Printer, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { KelasType } from '../../types';
import { buildMonthlyRapor } from '../../utils/rapor';
import { computeAttendanceRekap } from '../../utils/attendance';
import { StarSequenceSvg } from '../common/StarSequenceSvg';
import { AdaptiveMascotSvg } from '../common/AdaptiveMascotSvg';

const BULAN_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

interface CetakRaporViewProps {
  lockedSiswaId?: string;
}

export const CetakRaporView: React.FC<CetakRaporViewProps> = ({ lockedSiswaId }) => {
  const { db, schoolInfo, currentUser } = useApp();

  const [kelasFilter, setKelasFilter] = useState<KelasType>(() =>
    currentUser?.role === 'Guru' && currentUser.kelas_ampu ? currentUser.kelas_ampu : 'Kelas A'
  );
  const [selectedSiswaId, setSelectedSiswaId] = useState<string>(lockedSiswaId || 'ALL_OR_FIRST');
  const [batchPrintAll, setBatchPrintAll] = useState<boolean>(false);
  const [bulan, setBulan] = useState<number>(11);
  const [tahun, setTahun] = useState<number>(2026);
  const [showParentSignature, setShowParentSignature] = useState<boolean>(true);

  const classStudents = useMemo(() => {
    if (lockedSiswaId) {
      return db.siswa.filter((s) => s.siswa_id === lockedSiswaId);
    }
    return db.siswa.filter((s) => s.status_siswa === 'Aktif' && s.kelas_aktif === kelasFilter);
  }, [db.siswa, kelasFilter, lockedSiswaId]);

  const targetStudents = useMemo(() => {
    if (lockedSiswaId) return classStudents;
    if (batchPrintAll) return classStudents;
    const found = classStudents.find((s) => s.siswa_id === selectedSiswaId) || classStudents[0];
    return found ? [found] : [];
  }, [classStudents, batchPrintAll, selectedSiswaId, lockedSiswaId]);

  const periodeBulan = `${tahun}-${String(bulan).padStart(2, '0')}`;

  const attendanceMap = useMemo(() => {
    const rows = computeAttendanceRekap(db.siswa, db.daftarHadir, {
      mode: 'bulanan',
      periodeBulan,
    });
    return new Map(rows.map((r) => [r.siswa_id, r]));
  }, [db.siswa, db.daftarHadir, periodeBulan]);

  const rapors = useMemo(() => {
    return targetStudents.map((st) =>
      buildMonthlyRapor({
        siswa: st,
        logs: db.logMateriHarian,
        tahun,
        bulan,
        presensi: attendanceMap.get(st.siswa_id),
      })
    );
  }, [targetStudents, db.logMateriHarian, tahun, bulan, attendanceMap]);

  const todayFormatted = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Toolbar Kontrol (.no-print) */}
      <div className="no-print kartu space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl text-[#0f4527]">Cetak rapor bulanan</h1>
            <p className="text-xs text-[#55665a]">
              Rekap capaian bulanan anak beserta bintang, ilustrasi perkembangan, dan presensi siap cetak A4.
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="tbl"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / Simpan PDF</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          {!lockedSiswaId && (
            <>
              <label className="block">
                <span className="block font-extrabold text-xs mb-1">Kelas</span>
                <select
                  value={kelasFilter}
                  onChange={(e) => {
                    setKelasFilter(e.target.value as KelasType);
                    setSelectedSiswaId('ALL_OR_FIRST');
                  }}
                  className="isian-kontrol"
                >
                  <option value="Kelas A">Kelas A</option>
                  <option value="Kelas B">Kelas B</option>
                </select>
              </label>
              <label className="block">
                <span className="block font-extrabold text-xs mb-1">Anak</span>
                <select
                  disabled={batchPrintAll}
                  value={targetStudents[0]?.siswa_id || ''}
                  onChange={(e) => setSelectedSiswaId(e.target.value)}
                  className="isian-kontrol disabled:opacity-60"
                >
                  {classStudents.map((s) => (
                    <option key={s.siswa_id} value={s.siswa_id}>
                      {s.nama_anak}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}

          <label className="block">
            <span className="block font-extrabold text-xs mb-1">Bulan</span>
            <select
              value={bulan}
              onChange={(e) => setBulan(Number(e.target.value))}
              className="isian-kontrol"
            >
              {BULAN_NAMES.map((name, idx) => (
                <option key={name} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="block font-extrabold text-xs mb-1">Tahun</span>
            <input
              type="number"
              value={tahun}
              onChange={(e) => setTahun(Number(e.target.value) || 2026)}
              className="isian-kontrol font-mono-tabular"
            />
          </label>

          <div className="flex flex-col gap-2 pb-1">
            {!lockedSiswaId && (
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#1d2b21] cursor-pointer">
                <input
                  type="checkbox"
                  checked={batchPrintAll}
                  onChange={(e) => setBatchPrintAll(e.target.checked)}
                  className="w-4 h-4 accent-[#176238]"
                />
                <span>Semua siswa di kelas ini</span>
              </label>
            )}
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#1d2b21] cursor-pointer">
              <input
                type="checkbox"
                checked={showParentSignature}
                onChange={(e) => setShowParentSignature(e.target.checked)}
                className="w-4 h-4 accent-[#176238]"
              />
              <span>Tampilkan TTD Orang Tua</span>
            </label>
          </div>
        </div>
      </div>

      {/* Lembar Rapor A4 */}
      {rapors.length === 0 ? (
        <p className="kosong">Tidak ada siswa aktif pada kelas terpilih.</p>
      ) : (
        <div className="space-y-8">
          {rapors.map((rapor) => {
            const lvl = rapor.adaptiveLevel;
            return (
              <article
                key={rapor.siswa.siswa_id}
                data-testid={`rapor-sheet-${rapor.siswa.siswa_id}`}
                className="rapor-sheet rapor-page-break max-w-[210mm] mx-auto bg-white rounded-[26px] border border-[#d9d5c0] p-6 sm:p-8 space-y-5"
              >
                {/* Kop Lembaga */}
                <header className="flex items-center justify-between gap-4 border-b-[3px] border-double border-[#176238] pb-4">
                  <div className="flex items-center gap-3.5">
                    <img
                      src="/assets/aistudio/logo_76510846.png"
                      alt="Logo TK IT Al-Washliyah"
                      className="w-16 h-16 object-contain shrink-0"
                    />
                    <div>
                      <p className="text-xs font-extrabold text-[#176238] tracking-wide">
                        {schoolInfo.nama_sekolah} · NPSN {schoolInfo.npsn}
                      </p>
                      <h2 className="text-lg sm:text-xl text-[#1d2b21]">
                        Laporan Perkembangan Bulanan Anak
                      </h2>
                      <p className="text-[11px] text-[#55665a]">{schoolInfo.alamat_sekolah}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-[#1d2b21]">
                      {BULAN_NAMES[bulan - 1]} {tahun}
                    </p>
                    <p className="text-[11px] text-[#55665a]">
                      TA {schoolInfo.tahun_ajaran_aktif}
                    </p>
                  </div>
                </header>

                {/* Kartu Identitas & Hero Visual Adaptif (2 Kolom) */}
                <section className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
                  <div className="md:col-span-6 rounded-2xl border border-[#d9d5c0] bg-[#fbf6e7]/65 p-4 flex flex-col justify-between text-xs space-y-2">
                    <div className="space-y-1.5">
                      <div className="flex justify-between gap-2">
                        <span className="text-[#55665a]">Nama anak</span>
                        <span className="font-bold text-[#1d2b21] text-right">{rapor.siswa.nama_anak}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-[#55665a]">NIS / Kelas</span>
                        <span className="font-semibold text-[#1d2b21] font-mono-tabular">
                          {rapor.siswa.nis} · {rapor.siswa.kelas_aktif}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-[#55665a]">Track Literasi</span>
                        <span className="font-semibold text-[#1d2b21]">
                          {rapor.siswa.kelas_aktif === 'Kelas B'
                            ? rapor.siswa.target_literasi_kelas_b
                            : 'Standar Kelas A'}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-[#55665a]">Iqra Terakhir</span>
                        <span className="font-semibold text-[#176238]">{rapor.jilidIqraTerakhir}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-[#55665a]">Sesi Belajar</span>
                        <span className="font-semibold font-mono-tabular text-[#1d2b21]">
                          {rapor.totalSesi} Sesi
                        </span>
                      </div>
                    </div>

                    {rapor.presensi && (
                      <div className="pt-2 border-t border-[#d9d5c0] flex items-center justify-between text-[11px] font-mono-tabular">
                        <span className="text-[#55665a]">Presensi:</span>
                        <span className="font-semibold text-[#1d2b21]">
                          H:{rapor.presensi.hadir} · S:{rapor.presensi.sakit} · I:{rapor.presensi.izin} · A:{rapor.presensi.alpa}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Hero Visual Adaptif */}
                  <div
                    className={`md:col-span-6 rounded-2xl border p-4 flex items-center gap-3 ${lvl.accentBg} ${lvl.accentBorder}`}
                  >
                    <AdaptiveMascotSvg level={lvl.level} className="shrink-0" />
                    <div className="space-y-1.5">
                      <p className={`text-sm font-bold ${lvl.accentText}`}>{lvl.title}</p>
                      <StarSequenceSvg
                        stars={rapor.overallRoundedStars}
                        maxStars={4}
                        size="md"
                        label={`Capaian keseluruhan ${rapor.overallRoundedStars} dari 4 bintang`}
                      />
                      <p className="text-[11px] font-semibold text-slate-700">
                        {lvl.badgeText}
                        {rapor.overallAvgStars > 0 ? ` (${rapor.overallAvgStars}/4.0)` : ''}
                      </p>
                      <p className="text-[11px] leading-snug text-slate-700">{lvl.appreciation}</p>
                    </div>
                  </div>
                </section>

                {/* Peta Progres Mingguan */}
                <section className="rounded-xl border border-[#d9d5c0] px-4 py-3 flex flex-wrap items-center justify-between gap-3 bg-[#fbf6e7]/50">
                  <span className="text-xs font-bold text-[#1d2b21]">Progres mingguan</span>
                  <div className="flex flex-wrap items-center gap-4">
                    {rapor.weeklyStars.map((w) => (
                      <div key={w.weekLabel} className="flex items-center gap-1.5 text-[11px]">
                        <span className="font-semibold text-[#55665a]">{w.weekLabel}:</span>
                        {w.count > 0 ? (
                          <StarSequenceSvg stars={w.roundedStars} maxStars={4} size="sm" animated={false} />
                        ) : (
                          <span className="text-[#55665a]">–</span>
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                {/* Ringkasan Literasi & Hijaiyah/Iqra */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <section className="rounded-xl border border-[#d9d5c0] p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-[#d9d5c0] pb-2">
                      <h3 className="text-sm text-[#0f4527]">Literasi</h3>
                      <span className="text-xs font-mono-tabular font-semibold text-[#176238]">
                        {rapor.avgLiterasiStars || '-'}/4
                      </span>
                    </div>
                    {rapor.literasiCategories.length === 0 ? (
                      <p className="text-xs text-[#55665a]">Belum ada catatan literasi bulan ini.</p>
                    ) : (
                      <div className="space-y-2.5">
                        {rapor.literasiCategories.map((cat) => (
                          <div key={cat.kategori} className="flex items-start justify-between gap-2 text-xs">
                            <div>
                              <p className="font-semibold text-[#1d2b21]">{cat.kategori}</p>
                              <p className="text-[11px] text-[#55665a]">
                                {cat.items.slice(0, 8).join(', ')}
                                {cat.items.length > 8 ? ` (+${cat.items.length - 8} lagi)` : ''}
                              </p>
                            </div>
                            <StarSequenceSvg stars={cat.roundedStars} maxStars={4} size="sm" />
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="rounded-xl border border-[#d9d5c0] p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-[#d9d5c0] pb-2">
                      <h3 className="text-sm text-[#0f4527]">Hijaiyah &amp; Iqra</h3>
                      <span className="text-xs font-mono-tabular font-semibold text-[#176238]">
                        {rapor.avgHijaiyahStars || '-'}/4
                      </span>
                    </div>
                    {rapor.hijaiyahCategories.length === 0 ? (
                      <p className="text-xs text-[#55665a]">Belum ada catatan Hijaiyah/Iqra bulan ini.</p>
                    ) : (
                      <div className="space-y-2.5">
                        {rapor.hijaiyahCategories.map((cat) => (
                          <div key={cat.kategori} className="flex items-start justify-between gap-2 text-xs">
                            <div>
                              <p className="font-semibold text-[#1d2b21]">
                                {cat.kategori}{' '}
                                {cat.halamanRange ? (
                                  <span className="text-[#176238] font-normal">({cat.halamanRange})</span>
                                ) : null}
                              </p>
                              <p className="text-[13px] font-arabic text-[#1d2b21]" dir="rtl">
                                {cat.items.slice(0, 6).join(' ، ')}
                              </p>
                            </div>
                            <StarSequenceSvg stars={cat.roundedStars} maxStars={4} size="sm" />
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>

                {/* Catatan Guru & Aktivitas 5 Menit di Rumah */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-[#d9d5c0] bg-[#fbf6e7]/50 p-4 space-y-1.5">
                    <h3 className="text-xs text-[#0f4527]">Catatan guru</h3>
                    <p className="text-xs text-[#1d2b21] leading-relaxed">{rapor.catatanGuruTerbaru}</p>
                  </div>
                  <div className="rounded-xl border border-[#f2b632] bg-[#fdeab5]/45 p-4 space-y-1.5">
                    <h3 className="text-xs text-[#1d2b21] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#b4531f]" />
                      <span>Aktivitas 5 menit di rumah</span>
                    </h3>
                    <ul className="space-y-1 text-xs text-[#1d2b21] list-disc list-inside">
                      {rapor.aktivitas5Menit.map((tip, i) => (
                        <li key={i} className="leading-snug">{tip}</li>
                      ))}
                    </ul>
                  </div>
                </section>

                {/* Footer Tanda Tangan */}
                <footer className="pt-4 border-t border-[#d9d5c0]">
                  <p className="text-[11px] text-[#55665a] text-right mb-4">
                    Tasikmalaya, {todayFormatted}
                  </p>
                  <div
                    className={`grid gap-6 text-center text-xs ${
                      showParentSignature ? 'grid-cols-3' : 'grid-cols-2'
                    }`}
                  >
                    {showParentSignature && (
                      <div>
                        <p className="text-[#55665a]">Orang Tua / Wali</p>
                        <div className="h-14" />
                        <p className="font-semibold text-[#1d2b21] border-t border-[#d9d5c0] pt-1 mx-4">
                          ( ............................ )
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-[#55665a]">Wali {rapor.siswa.kelas_aktif}</p>
                      <div className="h-14" />
                      <p className="font-semibold text-[#1d2b21] border-t border-[#d9d5c0] pt-1 mx-4">
                        {db.users.find((u) => u.role === 'Guru' && u.kelas_ampu === rapor.siswa.kelas_aktif)
                          ?.nama_lengkap || 'Wali Kelas'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[#55665a]">Kepala {schoolInfo.nama_sekolah}</p>
                      <div className="h-14" />
                      <p className="font-semibold text-[#1d2b21] border-t border-[#d9d5c0] pt-1 mx-4">
                        {schoolInfo.kepala_sekolah}
                      </p>
                    </div>
                  </div>
                </footer>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
