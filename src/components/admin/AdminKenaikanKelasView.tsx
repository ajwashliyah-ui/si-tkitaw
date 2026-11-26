import React, { useMemo, useState } from 'react';
import { Calendar, CheckCircle2, Plus, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { RiwayatKelas, TahunAjaran } from '../../types';
import { KenaikanKelasBoard } from '../common/KenaikanKelasBoard';
import { KelolaKelasPanel } from './KelolaKelasPanel';
import { getMasterKelasList, getNextClassTarget } from '../../utils/kelas';
import { purgeStudentsFromDatabase } from '../../utils/studentCleanup';

export const AdminKenaikanKelasView: React.FC = () => {
  const { db, updateDb, addToast } = useApp();

  const [newTaName, setNewTaName] = useState('2027/2028');
  const [newTaMulai, setNewTaMulai] = useState('2027-07-12');
  const [newTaSelesai, setNewTaSelesai] = useState('2028-06-20');
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState('');

  const [rekapBulan, setRekapBulan] = useState<string>(() => {
    const months = [
      ...db.antropometri.map((a) => a.periode_bulan),
      ...db.logMateriHarian.map((l) => l.tanggal.slice(0, 7)),
      ...db.kaihHarian.map((k) => k.periode_bulan),
    ].sort();
    return months[months.length - 1] || '2026-11';
  });

  const activeTa = useMemo(
    () => db.tahunAjaran.find((t) => t.status_aktif) || db.tahunAjaran[0],
    [db.tahunAjaran]
  );

  const kelasList = useMemo(() => getMasterKelasList(db), [db]);

  const promotionSummary = useMemo(() => {
    const active = db.siswa.filter((s) => s.status_siswa === 'Aktif');
    let naikCount = 0;
    let lulusCount = 0;
    let tinggalCount = 0;

    for (const s of active) {
      if (s.keputusan_kenaikan === 'TINGGAL_KELAS') {
        tinggalCount += 1;
        continue;
      }
      const target = getNextClassTarget(db, s.kelas_aktif);
      if (target.isFinal || s.keputusan_kenaikan === 'LULUS_KE_SD') {
        lulusCount += 1;
      } else {
        naikCount += 1;
      }
    }
    return { naikCount, lulusCount, tinggalCount };
  }, [db]);

  const handleAddTahunAjaran = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaName.trim()) return;
    if (db.tahunAjaran.some((t) => t.nama_ta === newTaName.trim())) {
      addToast('Tahun ajaran tersebut sudah ada.', 'error');
      return;
    }
    const newTa: TahunAjaran = {
      ta_id: `TA-${newTaName.trim().replace(/[^0-9]/g, '')}`,
      nama_ta: newTaName.trim(),
      tanggal_mulai: newTaMulai,
      tanggal_selesai: newTaSelesai,
      status_aktif: false,
    };
    await updateDb(
      (prev) => ({ ...prev, tahunAjaran: [...prev.tahunAjaran, newTa] }),
      `Tahun ajaran ${newTa.nama_ta} ditambahkan.`
    );
  };

  const handleSetActiveTa = async (taId: string) => {
    const target = db.tahunAjaran.find((t) => t.ta_id === taId);
    if (!target) return;
    await updateDb(
      (prev) => ({
        ...prev,
        tahunAjaran: prev.tahunAjaran.map((t) => ({
          ...t,
          status_aktif: t.ta_id === taId,
        })),
        pengaturanSekolah: {
          ...prev.pengaturanSekolah,
          tahun_ajaran_aktif: target.nama_ta,
        },
      }),
      `Tahun ajaran aktif diubah ke ${target.nama_ta}.`
    );
  };

  const handleProsesKenaikanKelasOtomatis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmPhrase.trim().toUpperCase() !== 'NAIK KELAS') {
      addToast('Ketik NAIK KELAS tepat seperti contoh untuk melanjutkan.', 'error');
      return;
    }
    const nextTa =
      db.tahunAjaran.find((t) => !t.status_aktif && t.nama_ta > (activeTa?.nama_ta || '')) ||
      activeTa;

    const graduatedIds: string[] = [];
    for (const s of db.siswa) {
      if (s.status_siswa !== 'Aktif') continue;
      if (s.keputusan_kenaikan === 'TINGGAL_KELAS') continue;
      const target = getNextClassTarget(db, s.kelas_aktif);
      if (target.isFinal || s.keputusan_kenaikan === 'LULUS_KE_SD') {
        graduatedIds.push(s.siswa_id);
      }
    }

    await updateDb(
      (prev) => {
        const waliMap = new Map(
          prev.users
            .filter((u) => u.role === 'Guru' && u.kelas_ampu)
            .map((u) => [u.kelas_ampu as string, u.user_id])
        );
        const siswaMap = new Map(prev.siswa.map((s) => [s.siswa_id, s]));
        const updatedRiwayat: RiwayatKelas[] = prev.riwayatKelas.map((r) => {
          if (r.ta_id === activeTa?.ta_id && r.status_akhir === 'Berjalan') {
            const student = siswaMap.get(r.siswa_id);
            if (student?.keputusan_kenaikan === 'TINGGAL_KELAS') {
              return {
                ...r,
                status_akhir: 'Tinggal Kelas',
                catatan: student.catatan_kenaikan || `Tinggal di ${r.kelas}`,
              };
            }
            const target = getNextClassTarget(prev, r.kelas);
            if (target.isFinal || student?.keputusan_kenaikan === 'LULUS_KE_SD') {
              return { ...r, status_akhir: 'Lulus', catatan: 'Lulus · Melanjutkan ke SD' };
            }
            return {
              ...r,
              status_akhir: 'Naik Kelas',
              catatan: `Naik ke ${target.nextClassName}`,
            };
          }
          return r;
        });

        const newRiwayatRows: RiwayatKelas[] = [];
        const batchGradIds: string[] = [];
        const updatedSiswa = prev.siswa.map((s) => {
          if (s.status_siswa !== 'Aktif') return s;
          if (s.keputusan_kenaikan === 'TINGGAL_KELAS') {
            if (nextTa && nextTa.ta_id !== activeTa?.ta_id) {
              newRiwayatRows.push({
                riwayat_id: `RWY-${Date.now()}-${s.siswa_id}`,
                siswa_id: s.siswa_id,
                ta_id: nextTa.ta_id,
                nama_ta: nextTa.nama_ta,
                kelas: s.kelas_aktif,
                wali_kelas_id: waliMap.get(s.kelas_aktif) || '',
                status_akhir: 'Berjalan',
                catatan: s.catatan_kenaikan || `Mengulang di ${s.kelas_aktif}`,
              });
            }
            return {
              ...s,
              keputusan_kenaikan: 'BELUM_DITENTUKAN' as const,
            };
          }
          const target = getNextClassTarget(prev, s.kelas_aktif);
          if (target.isFinal || s.keputusan_kenaikan === 'LULUS_KE_SD') {
            batchGradIds.push(s.siswa_id);
            return {
              ...s,
              kelas_aktif: 'Lulus' as const,
              status_siswa: 'Lulus' as const,
              keputusan_kenaikan: 'LULUS_KE_SD' as const,
              catatan_kenaikan: s.catatan_kenaikan || 'Melanjutkan ke SD',
            };
          }
          if (nextTa) {
            newRiwayatRows.push({
              riwayat_id: `RWY-${Date.now()}-${s.siswa_id}`,
              siswa_id: s.siswa_id,
              ta_id: nextTa.ta_id,
              nama_ta: nextTa.nama_ta,
              kelas: target.nextClassName,
              wali_kelas_id: waliMap.get(target.nextClassName) || '',
              status_akhir: 'Berjalan',
            });
          }
          return {
            ...s,
            kelas_aktif: target.nextClassName,
            keputusan_kenaikan: 'BELUM_DITENTUKAN' as const,
          };
        });

        const nextDb = {
          ...prev,
          siswa: updatedSiswa,
          riwayatKelas: [...updatedRiwayat, ...newRiwayatRows],
          tahunAjaran: nextTa
            ? prev.tahunAjaran.map((t) => ({ ...t, status_aktif: t.ta_id === nextTa.ta_id }))
            : prev.tahunAjaran,
          pengaturanSekolah: nextTa
            ? { ...prev.pengaturanSekolah, tahun_ajaran_aktif: nextTa.nama_ta }
            : prev.pengaturanSekolah,
        };
        return batchGradIds.length > 0 ? purgeStudentsFromDatabase(nextDb, batchGradIds) : nextDb;
      },
      promotionSummary.lulusCount > 0
        ? `${promotionSummary.naikCount} naik kelas, ${promotionSummary.lulusCount} lulus ke SD (data otomatis dihapus), ${promotionSummary.tinggalCount} tinggal kelas.`
        : `${promotionSummary.naikCount} naik kelas, ${promotionSummary.tinggalCount} tinggal kelas.`,
      graduatedIds.length > 0 ? { graduatedSiswaIds: graduatedIds } : undefined
    );

    setConfirmPhrase('');
    setShowPromoteModal(false);
  };

  // Monthly completeness recap per student
  const completenessRows = useMemo(() => {
    return db.siswa
      .filter((s) => s.status_siswa === 'Aktif')
      .map((s) => {
        const hasAntro = db.antropometri.some(
          (a) => a.siswa_id === s.siswa_id && a.periode_bulan === rekapBulan
        );
        const hasLitOrDaily =
          db.literasi.some((l) => l.siswa_id === s.siswa_id && l.periode_bulan === rekapBulan) ||
          db.logMateriHarian.some(
            (l) => l.id_siswa === s.siswa_id && l.tanggal.startsWith(rekapBulan)
          );
        const hasAgama = db.keagamaan.some(
          (k) => k.siswa_id === s.siswa_id && k.periode_bulan === rekapBulan
        );
        const kaihDays = db.kaihHarian.filter(
          (k) => k.siswa_id === s.siswa_id && k.periode_bulan === rekapBulan
        ).length;
        const kaihPhotos = db.kaihFotoBulanan.filter(
          (f) => f.siswa_id === s.siswa_id && f.periode_bulan === rekapBulan
        ).length;
        return {
          siswa: s,
          hasAntro,
          hasLitOrDaily,
          hasAgama,
          kaihDays,
          kaihPhotos,
        };
      });
  }, [db, rekapBulan]);

  const totalSiswa = completenessRows.length;
  const antroCount = completenessRows.filter((r) => r.hasAntro).length;
  const litCount = completenessRows.filter((r) => r.hasLitOrDaily).length;
  const agamaCount = completenessRows.filter((r) => r.hasAgama).length;
  const kaihCount = completenessRows.filter((r) => r.kaihDays > 0 || r.kaihPhotos > 0).length;

  return (
    <div className="halaman">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl text-[#0f4527]">Kelengkapan laporan</h1>
          <p className="text-sm text-[#55665a] mt-1">
            Pantau isian guru dan orang tua tiap bulan, serta kelola tahun ajaran sekolah.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="rekap-bulan" className="text-xs font-bold text-[#55665a]">
            Bulan
          </label>
          <input
            id="rekap-bulan"
            type="month"
            value={rekapBulan}
            onChange={(e) => setRekapBulan(e.target.value)}
            className="isian-kontrol w-auto min-h-[40px] text-sm font-mono-tabular"
          />
        </div>
      </div>

      {/* Ringkasan Progress Bulanan */}
      {totalSiswa > 0 ? (
        <>
          <dl className="status">
            <div>
              <dt>Antropometri</dt>
              <dd>
                {antroCount} dari {totalSiswa}
              </dd>
              <progress max={totalSiswa} value={antroCount} />
            </div>
            <div>
              <dt>Literasi</dt>
              <dd>
                {litCount} dari {totalSiswa}
              </dd>
              <progress max={totalSiswa} value={litCount} />
            </div>
            <div>
              <dt>Keagamaan</dt>
              <dd>
                {agamaCount} dari {totalSiswa}
              </dd>
              <progress max={totalSiswa} value={agamaCount} />
            </div>
            <div>
              <dt>7 KAIH (orang tua)</dt>
              <dd>
                {kaihCount} dari {totalSiswa}
              </dd>
              <progress max={totalSiswa} value={kaihCount} />
            </div>
          </dl>

          <section className="kartu">
            <div className="judul-baris">
              <h2 className="text-lg text-[#0f4527]">Rincian per anak</h2>
              <span className="text-xs text-[#55665a]">{totalSiswa} siswa aktif</span>
            </div>
            <div className="geser">
              <table className="tabel-bersih">
                <thead>
                  <tr>
                    <th>Anak</th>
                    <th>Kelas</th>
                    <th>Antropometri</th>
                    <th>Literasi / harian</th>
                    <th>Keagamaan</th>
                    <th>7 KAIH (ortu)</th>
                    <th>Foto 7 aspek</th>
                  </tr>
                </thead>
                <tbody>
                  {completenessRows.map((row) => (
                    <tr key={row.siswa.siswa_id}>
                      <td className="font-bold text-[#1d2b21]">{row.siswa.nama_anak}</td>
                      <td>{row.siswa.kelas_aktif}</td>
                      <td className={row.hasAntro ? 'sudah' : 'belum'}>
                        {row.hasAntro ? 'Sudah' : 'Belum'}
                      </td>
                      <td className={row.hasLitOrDaily ? 'sudah' : 'belum'}>
                        {row.hasLitOrDaily ? 'Sudah' : 'Belum'}
                      </td>
                      <td className={row.hasAgama ? 'sudah' : 'belum'}>
                        {row.hasAgama ? 'Sudah' : 'Belum'}
                      </td>
                      <td className="font-mono-tabular font-bold text-[#1d2b21]">
                        {row.kaihDays} hari
                      </td>
                      <td className="font-mono-tabular font-bold text-[#1d2b21]">
                        {row.kaihPhotos} / 7
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <p className="kosong mb-6">Belum ada siswa aktif. Tambahkan lewat menu Siswa.</p>
      )}

      {/* Pengaturan Daftar Kelas Custom + Papan Drag & Drop, Ceklis & Konfirmasi */}
      <div className="space-y-6">
        <KelolaKelasPanel />
        <KenaikanKelasBoard mode="admin" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start mt-6">
        {/* Tahun Ajaran */}
        <section className="lg:col-span-6 kartu space-y-4">
          <div className="judul-baris">
            <h2 className="text-lg text-[#0f4527] inline-flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#176238]" />
              <span>Tahun ajaran</span>
            </h2>
          </div>

          <div className="space-y-2">
            {db.tahunAjaran.map((ta) => (
              <div
                key={ta.ta_id}
                className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${
                  ta.status_aktif
                    ? 'border-[#176238] bg-[#dcebd2]/50'
                    : 'border-[#d9d5c0] bg-[#fbf6e7]'
                }`}
              >
                <div>
                  <p className="text-sm font-bold text-[#1d2b21] font-mono-tabular">
                    TA {ta.nama_ta}
                  </p>
                  <p className="text-xs text-[#55665a]">
                    {ta.tanggal_mulai} s.d. {ta.tanggal_selesai}
                  </p>
                </div>
                {ta.status_aktif ? (
                  <span className="inline-flex items-center gap-1 text-xs font-extrabold text-[#0f4527]">
                    <CheckCircle2 className="w-4 h-4" />
                    Berjalan
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSetActiveTa(ta.ta_id)}
                    className="tbl polos kecil"
                  >
                    Aktifkan
                  </button>
                )}
              </div>
            ))}
          </div>

          <form onSubmit={handleAddTahunAjaran} className="pt-3 border-t border-[#d9d5c0] space-y-3">
            <p className="text-xs font-bold text-[#55665a]">Tambah tahun ajaran baru</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <input
                type="text"
                aria-label="Nama Tahun Ajaran"
                value={newTaName}
                onChange={(e) => setNewTaName(e.target.value)}
                placeholder="2027/2028"
                className="isian-kontrol min-h-[38px] text-xs font-mono-tabular"
              />
              <input
                type="date"
                aria-label="Tanggal Mulai TA"
                value={newTaMulai}
                onChange={(e) => setNewTaMulai(e.target.value)}
                className="isian-kontrol min-h-[38px] text-xs"
              />
              <input
                type="date"
                aria-label="Tanggal Selesai TA"
                value={newTaSelesai}
                onChange={(e) => setNewTaSelesai(e.target.value)}
                className="isian-kontrol min-h-[38px] text-xs"
              />
            </div>
            <button type="submit" className="tbl kecil">
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah</span>
            </button>
          </form>
        </section>

        {/* Kenaikan Kelas - Danger Card */}
        <section className="lg:col-span-6 kartu bahaya space-y-4">
          <div className="judul-baris">
            <h2 className="text-lg text-[#a33a25]">Proses kenaikan akhir tahun ajaran</h2>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3 rounded-xl bg-[#dcebd2]/60 border border-[#d9d5c0]">
              <p className="text-[11px] text-[#0f4527] font-bold">Naik ke jenjang berikutnya</p>
              <p className="text-2xl font-display font-semibold text-[#0f4527] font-mono-tabular mt-1">
                {promotionSummary.naikCount}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-[#fdeab5]/70 border border-[#f2b632]">
              <p className="text-[11px] text-[#7c4d03] font-bold">Lulus (Ke SD)</p>
              <p className="text-2xl font-display font-semibold text-[#7c4d03] font-mono-tabular mt-1">
                {promotionSummary.lulusCount}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-[#f8dcd6]/60 border border-[#d9d5c0]">
              <p className="text-[11px] text-[#a33a25] font-bold">Tinggal kelas</p>
              <p className="text-2xl font-display font-semibold text-[#a33a25] font-mono-tabular mt-1">
                {promotionSummary.tinggalCount}
              </p>
            </div>
          </div>

          <p className="text-xs text-[#55665a] m-0">
            Alur kelas aktif:{' '}
            <strong className="text-[#0f4527]">
              {kelasList.map((k) => k.nama_kelas).join(' → ')} → Lulus (SD)
            </strong>
          </p>

          <p className="text-sm text-[#1d2b21] leading-relaxed">
            Tahun ajaran berjalan: <strong>{activeTa?.nama_ta || '-'}</strong>. Proses massal akan mengikuti urutan kelas custom dan konfirmasi di papan atas: murid yang ditandai <strong>Tinggal Kelas</strong> tetap berada di kelasnya.
          </p>

          <button
            type="button"
            onClick={() => {
              setConfirmPhrase('');
              setShowPromoteModal(true);
            }}
            disabled={
              promotionSummary.naikCount === 0 &&
              promotionSummary.lulusCount === 0 &&
              promotionSummary.tinggalCount === 0
            }
            className="tbl merah"
          >
            Proses kenaikan akhir tahun
          </button>
        </section>
      </div>

      {/* Modal Konfirmasi Kenaikan Kelas */}
      {showPromoteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b1f14]/55 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="judul-naik-kelas"
        >
          <div className="w-full max-w-md bg-[#fffdf7] rounded-[26px] border border-[#d9d5c0] p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 id="judul-naik-kelas" className="text-xl text-[#a33a25]">
                Konfirmasi kenaikan kelas
              </h2>
              <button
                type="button"
                onClick={() => setShowPromoteModal(false)}
                aria-label="Tutup dialog"
                className="w-9 h-9 rounded-full flex items-center justify-center text-[#55665a] hover:bg-[#dcebd2] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleProsesKenaikanKelasOtomatis} className="space-y-4">
              <div className="text-sm text-[#1d2b21] space-y-2">
                <p className="m-0">
                  <strong>{promotionSummary.naikCount} anak</strong> akan naik ke jenjang kelas berikutnya,{' '}
                  <strong>{promotionSummary.lulusCount} anak</strong> akan Lulus (melanjutkan ke SD), dan{' '}
                  <strong>{promotionSummary.tinggalCount} anak</strong> tetap Tinggal Kelas sesuai konfirmasi.
                </p>
                {promotionSummary.lulusCount > 0 && (
                  <div className="p-3 rounded-xl bg-[#f8dcd6]/70 border border-[#e3a396] text-xs text-[#7a2515] leading-relaxed">
                    <strong>Pembersihan otomatis:</strong> Seluruh data, nilai, absensi, 7 KAIH, hasil karya,
                    dan riwayat <strong>{promotionSummary.lulusCount} murid lulus</strong> akan otomatis
                    dihapus dari aplikasi dan Google Sheets agar tidak menjadi sampah data.
                  </div>
                )}
                <p className="text-xs text-[#55665a] m-0">
                  Ketik <strong>NAIK KELAS</strong> untuk melanjutkan.
                </p>
              </div>
              <div>
                <label htmlFor="konf-naik" className="block text-xs font-bold text-[#55665a] mb-1">
                  Konfirmasi
                </label>
                <input
                  id="konf-naik"
                  type="text"
                  required
                  value={confirmPhrase}
                  onChange={(e) => setConfirmPhrase(e.target.value)}
                  placeholder="NAIK KELAS"
                  className="isian-kontrol font-mono-tabular"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPromoteModal(false)}
                  className="tbl polos"
                >
                  Batal
                </button>
                <button type="submit" className="tbl merah">
                  Proses
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
