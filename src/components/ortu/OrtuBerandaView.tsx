import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { selectAdaptiveParentTips } from '../../utils/rapor';
import { isKelasLanjutan } from '../../utils/kelas';
import { MotionCard, MotionTabBar, MotionTabPanel } from '../common/MotionPrimitives';
import { StorySceneGrowth } from './StorySceneGrowth';

interface OrtuBerandaViewProps {
  selectedSiswaId: string;
  onSelectSiswa: (id: string) => void;
  onNavigateTab: (tab: string) => void;
}

const KATEGORI_TIP_LABEL: Record<string, string> = {
  ANTRO: 'Pertumbuhan',
  LIT: 'Literasi',
  KAIH: 'Kebiasaan',
  AGAMA: 'Keagamaan',
};

export const OrtuBerandaView: React.FC<OrtuBerandaViewProps> = ({
  selectedSiswaId,
  onSelectSiswa,
  onNavigateTab,
}) => {
  const { db, currentUser } = useApp();
  const [materiTab, setMateriTab] = useState<'Literasi' | 'Hijaiyah_Iqra'>('Literasi');
  const [filterTaId, setFilterTaId] = useState<string>('ACTIVE');

  const myChildren = useMemo(() => {
    const linked = db.siswa.filter((s) => s.ortu_user_id === currentUser?.user_id);
    return linked.length > 0 ? linked : db.siswa;
  }, [db.siswa, currentUser]);

  const student = useMemo(
    () => myChildren.find((s) => s.siswa_id === selectedSiswaId) || myChildren[0],
    [myChildren, selectedSiswaId]
  );

  const activeTa = db.tahunAjaran.find((t) => t.status_aktif)?.ta_id || 'TA-2026-2027';
  const effectiveTaId = filterTaId === 'ACTIVE' ? activeTa : filterTaId;
  const isArchive = filterTaId !== 'ACTIVE' && filterTaId !== activeTa;
  const currentPeriodeBulan = '2026-11';

  const archiveHistory = useMemo(() => {
    if (!student) return [];
    return db.riwayatKelas.filter((r) => r.siswa_id === student.siswa_id);
  }, [db.riwayatKelas, student]);

  const latestAntro = useMemo(() => {
    if (!student) return null;
    return db.antropometri
      .filter((a) => a.siswa_id === student.siswa_id && a.ta_id === effectiveTaId)
      .sort((a, b) => a.periode_bulan.localeCompare(b.periode_bulan))
      .pop();
  }, [db.antropometri, student, effectiveTaId]);

  const hasLiterasi = useMemo(() => {
    if (!student) return false;
    return db.literasi.some(
      (l) => l.siswa_id === student.siswa_id && l.ta_id === effectiveTaId
    );
  }, [db.literasi, student, effectiveTaId]);

  const allDailyLogsCount = useMemo(() => {
    if (!student) return 0;
    return db.logMateriHarian.filter(
      (l) => l.id_siswa === student.siswa_id && l.ta_id === effectiveTaId
    ).length;
  }, [db.logMateriHarian, student, effectiveTaId]);

  const literasiStatus = hasLiterasi || allDailyLogsCount > 0 ? 'Sudah dinilai' : 'Belum dinilai';

  const agamaCount = useMemo(() => {
    if (!student) return 0;
    return db.keagamaan.filter(
      (k) => k.siswa_id === student.siswa_id && k.ta_id === effectiveTaId
    ).length;
  }, [db.keagamaan, student, effectiveTaId]);

  const kaihDaysCount = useMemo(() => {
    if (!student) return 0;
    return db.kaihHarian.filter(
      (k) => k.siswa_id === student.siswa_id && k.ta_id === effectiveTaId && k.periode_bulan === currentPeriodeBulan
    ).length;
  }, [db.kaihHarian, student, effectiveTaId]);

  const latestDailyLogs = useMemo(() => {
    if (!student) return [];
    return db.logMateriHarian
      .filter(
        (l) =>
          l.id_siswa === student.siswa_id &&
          l.ta_id === effectiveTaId &&
          l.bidang === materiTab
      )
      .sort((a, b) => b.tanggal.localeCompare(a.tanggal))
      .slice(0, 6);
  }, [db.logMateriHarian, student, effectiveTaId, materiTab]);

  const latihanSingkatItems = useMemo(() => {
    if (!student) return [];
    return db.logMateriHarian
      .filter(
        (l) =>
          l.id_siswa === student.siswa_id &&
          l.ta_id === effectiveTaId &&
          (l.status_penguasaan === 'Perlu Latihan' || l.status_penguasaan === 'Mulai Mengenal')
      )
      .sort((a, b) => b.tanggal.localeCompare(a.tanggal))
      .slice(0, 3);
  }, [db.logMateriHarian, student, effectiveTaId]);

  const adaptiveTips = useMemo(() => {
    if (!student) return [];
    return selectAdaptiveParentTips({
      siswa: student,
      periodeBulan: currentPeriodeBulan,
      masterTips: db.masterTips,
      antropometri: db.antropometri.filter((a) => a.ta_id === effectiveTaId),
      literasi: db.literasi.filter((l) => l.ta_id === effectiveTaId),
      kaihHarian: db.kaihHarian.filter((k) => k.ta_id === effectiveTaId),
      keagamaan: db.keagamaan.filter((k) => k.ta_id === effectiveTaId),
      isLanjutan: isKelasLanjutan(db, student.kelas_aktif),
    });
  }, [student, db, effectiveTaId]);

  const studentKarya = useMemo(() => {
    if (!student) return [];
    return db.asesmenHasilKarya.filter(
      (k) => k.siswa_id === student.siswa_id && k.ta_id === effectiveTaId
    );
  }, [db.asesmenHasilKarya, student, effectiveTaId]);

  if (!student) {
    return (
      <p className="kosong">
        Akun ini belum terhubung dengan data anak. Hubungi Admin sekolah.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pilihan Anak & Arsip Kelas */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          {myChildren.length > 1 && (
            <label className="block min-w-[190px]">
              <span className="block font-extrabold text-xs text-[#55665a] mb-1">Anak</span>
              <select
                id="ortu-pilih-anak"
                value={student.siswa_id}
                onChange={(e) => onSelectSiswa(e.target.value)}
                className="isian-kontrol"
              >
                {myChildren.map((c) => (
                  <option key={c.siswa_id} value={c.siswa_id}>
                    {c.nama_anak} ({c.kelas_aktif})
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="block min-w-[230px]">
            <span className="block font-extrabold text-xs text-[#55665a] mb-1">
              Tahun ajaran dan kelas
            </span>
            <select
              id="ortu-filter-arsip"
              value={filterTaId}
              onChange={(e) => setFilterTaId(e.target.value)}
              className="isian-kontrol"
            >
              <option value="ACTIVE">
                {db.pengaturanSekolah.tahun_ajaran_aktif}, {student.kelas_aktif}
              </option>
              {archiveHistory.map((r) => (
                <option key={r.riwayat_id} value={r.ta_id}>
                  {r.nama_ta}, {r.kelas} ({r.status_akhir})
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          type="button"
          onClick={() => onNavigateTab('perkembangan')}
          className="tbl polos pegas-tekan"
        >
          Cetak rapor
        </button>
      </div>

      {/* Identitas Anak (hijau daun + inisial tetes) */}
      <div className="identitas justify-between kartu-hadir">
        <div className="flex items-center gap-3.5 min-w-0">
          <span className="inisial cap-pop" aria-hidden="true">
            {student.nama_anak.charAt(0)}
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl text-[#0f4527]">{student.nama_anak}</h1>
            <p className="text-sm text-[#1d2b21]">
              NIS {student.nis}, {student.kelas_aktif}
              {isKelasLanjutan(db, student.kelas_aktif) ? ` · ${student.target_literasi_kelas_b}` : ''}
              {isArchive ? '. Arsip, hanya bisa dibaca.' : ''}
            </p>
          </div>
        </div>
        <svg
          viewBox="0 0 64 52"
          className="hidden sm:block w-14 h-12 shrink-0 anim-float"
          aria-hidden="true"
        >
          <circle cx="42" cy="18" r="10" fill="#f2b632" />
          <path d="M18 44 V26" stroke="#176238" strokeWidth="3" strokeLinecap="round" />
          <path d="M18 30 C10 29 7 20 15 19 C19 19 19 26 18 30 Z" fill="#176238" />
          <path d="M18 28 C26 27 29 18 21 17 C17 17 17 24 18 28 Z" fill="#7ab86c" />
          <circle cx="42" cy="18" r="14" fill="none" stroke="#f2b632" strokeWidth="2" strokeDasharray="3 4" />
        </svg>
      </div>

      {/* Dynamic Story Scene SVG Growth Journey */}
      <StorySceneGrowth
        student={student}
        latestAntro={latestAntro}
        hasLiterasi={hasLiterasi}
        dailyLogsCount={allDailyLogsCount}
        agamaCount={agamaCount}
        kaihDaysCount={kaihDaysCount}
        karyaCount={studentKarya.length}
        onNavigateTab={onNavigateTab}
      />

      {/* Ringkasan 4 Kolom */}
      <dl className="status">
        <div>
          <dt>Pertumbuhan</dt>
          <dd className="tabular-nums">
            {latestAntro
              ? `${latestAntro.status_gizi_otomatis} (${latestAntro.periode_bulan})`
              : 'Belum diukur'}
          </dd>
        </div>
        <div>
          <dt>Literasi</dt>
          <dd>{literasiStatus}</dd>
        </div>
        <div>
          <dt>Keagamaan</dt>
          <dd className="tabular-nums">
            {agamaCount > 0 ? `${agamaCount} materi dinilai` : 'Belum dinilai'}
          </dd>
        </div>
        <div>
          <dt>7 KAIH bulan ini</dt>
          <dd className="tabular-nums">
            {kaihDaysCount > 0 ? `${kaihDaysCount} hari diisi` : 'Belum diisi'}
          </dd>
        </div>
      </dl>

      {/* Tips Praktis untuk Ayah & Bunda (4 Kartu Melengkung Pastel) */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="text-xl text-[#0f4527]">Tips Praktis untuk Ayah &amp; Bunda</h2>
          <button
            type="button"
            onClick={() => onNavigateTab('kaih')}
            className="tbl polos kecil pegas-tekan"
          >
            Isi 7 KAIH hari ini
          </button>
        </div>

        {adaptiveTips.length > 0 ? (
          <div className="tips">
            {adaptiveTips.map((tip) => (
              <article key={tip.tips_id} className="kilau-hangat">
                <small>{KATEGORI_TIP_LABEL[tip.kategori_pemicu] || tip.kategori_pemicu}</small>
                <h3>{tip.judul_tips}</h3>
                <p>{tip.isi_tips_ayah_bunda}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="kosong">Tips muncul setelah ada laporan yang terisi.</p>
        )}
      </section>

      {/* Yang Sedang Dipelajari Ananda */}
      <MotionCard className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl text-[#0f4527]">Yang sedang dipelajari</h2>
            <p className="text-sm text-[#55665a]">
              Catatan materi harian (Senin–Jumat) terbaru dari guru kelas.
            </p>
          </div>
          <MotionTabBar
            layoutId="ortu-materi-tab-pill"
            ariaLabel="Pilih bidang materi belajar"
            className="self-start lg:self-auto"
            value={materiTab}
            onChange={setMateriTab}
            options={[
              { id: 'Literasi', label: 'Literasi' },
              { id: 'Hijaiyah_Iqra', label: 'Hijaiyah & Iqra' },
            ]}
          />
        </div>

        <MotionTabPanel panelKey={materiTab}>
          {latestDailyLogs.length === 0 ? (
            <p className="kosong">
              Belum ada catatan {materiTab === 'Literasi' ? 'Literasi' : 'Hijaiyah/Iqra'} pada tahun ajaran ini.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {latestDailyLogs.map((log) => (
                <div
                  key={log.id_log}
                  className="rounded-[14px] border border-[#d9d5c0] bg-[#fbf6e7]/65 p-4 space-y-1.5 kartu-taktil"
                >
                  <div className="flex items-center justify-between text-xs text-[#55665a]">
                    <span className="font-mono-tabular">{log.tanggal}</span>
                    <span className="nilai">{log.status_penguasaan}</span>
                  </div>
                  <p className="text-xs font-bold text-[#0f4527]">
                    {log.kategori}
                    {log.halaman_iqra ? ` · ${log.halaman_iqra}` : ''}
                  </p>
                  <p
                    dir={log.bidang === 'Hijaiyah_Iqra' ? 'rtl' : 'ltr'}
                    className={
                      log.bidang === 'Hijaiyah_Iqra'
                        ? 'font-arabic text-2xl text-[#1d2b21]'
                        : 'text-base font-bold text-[#1d2b21]'
                    }
                  >
                    {log.item_dipilih}
                  </p>
                  {log.catatan_guru && (
                    <p className="text-xs text-[#55665a]">{log.catatan_guru}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </MotionTabPanel>

        {latihanSingkatItems.length > 0 && (
          <div className="rounded-[14px] border border-[#f2b632] bg-[#fdeab5]/45 p-4 space-y-1.5">
            <p className="text-xs font-extrabold text-[#1d2b21]">
              Latihan 5 menit di rumah
            </p>
            <ul className="space-y-1 text-xs text-[#1d2b21] list-disc list-inside">
              {latihanSingkatItems.map((item) => (
                <li key={item.id_log}>
                  Ulangi <strong>{item.kategori}</strong>
                  {item.halaman_iqra ? ` (${item.halaman_iqra})` : ''}:{' '}
                  <span className="font-bold">{item.item_dipilih}</span> — {item.status_penguasaan}
                </li>
              ))}
            </ul>
          </div>
        )}
      </MotionCard>

      {/* Galeri Karya & Riwayat Kelas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <MotionCard className="lg:col-span-7 space-y-3" delay={0.05}>
          <h2 className="text-xl text-[#0f4527]">Hasil karya di sekolah</h2>
          {studentKarya.length === 0 ? (
            <p className="kosong">Belum ada foto hasil karya pada tahun ajaran ini.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {studentKarya.map((k) => (
                <div
                  key={k.karya_id}
                  className="galeri-foto rounded-[14px] border border-[#d9d5c0] overflow-hidden bg-[#fbf6e7]/50 kartu-taktil"
                >
                  <img
                    src={k.foto_url}
                    alt={k.deskripsi_karya}
                    referrerPolicy="no-referrer"
                    className="w-full h-40 object-cover"
                  />
                  <div className="p-3 space-y-1">
                    <p className="text-[11px] text-[#55665a] font-mono-tabular">{k.tanggal}</p>
                    <p className="text-xs font-bold text-[#1d2b21]">{k.deskripsi_karya}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </MotionCard>

        <MotionCard className="lg:col-span-5 space-y-3" delay={0.1}>
          <h2 className="text-xl text-[#0f4527]">Riwayat kelas</h2>
          <ul className="daftar">
            {archiveHistory.map((r) => (
              <li key={r.riwayat_id}>
                <div>
                  <strong className="text-sm text-[#1d2b21]">
                    {r.nama_ta}, {r.kelas}
                  </strong>
                </div>
                <span className="nilai">{r.status_akhir}</span>
              </li>
            ))}
          </ul>
        </MotionCard>
      </div>
    </div>
  );
};
