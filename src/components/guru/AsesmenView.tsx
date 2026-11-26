import React, { useMemo, useState } from 'react';
import { Camera, CheckSquare, FileText, Trash2, Upload, Search } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  AsesmenAnekdot,
  AsesmenCeklis,
  AsesmenHasilKarya,
  SemesterType,
} from '../../types';
import {
  checkHasilKaryaMonthlyQuota,
  getSemesterFromMonth,
  MAX_HASIL_KARYA_PER_MONTH,
} from '../../utils/attendance';
import { compressImageFile } from '../../utils/imageCompress';
import { isKelasLanjutan } from '../../utils/kelas';
import { sanitizeImageUrl } from '../../utils/crypto';
import { MotionTabBar } from '../common/MotionPrimitives';

export const AsesmenView: React.FC = () => {
  const { db, currentUser, updateDb, addToast, triggerCelebration } = useApp();

  const availableStudents = useMemo(() => {
    return db.siswa.filter((s) => {
      if (s.status_siswa !== 'Aktif') return false;
      if (currentUser?.role === 'Guru' && currentUser.kelas_ampu) {
        return s.kelas_aktif === currentUser.kelas_ampu;
      }
      return true;
    });
  }, [db.siswa, currentUser]);

  const [subMenu, setSubMenu] = useState<'anekdot' | 'karya' | 'ceklis'>('anekdot');
  const [selectedSiswaId, setSelectedSiswaId] = useState<string>(
    () => availableStudents[0]?.siswa_id || ''
  );

  const student = useMemo(
    () => availableStudents.find((s) => s.siswa_id === selectedSiswaId) || availableStudents[0],
    [availableStudents, selectedSiswaId]
  );

  // ---- Sub-menu 1: Catatan Anekdot ----
  const [anekdotTanggal, setAnekdotTanggal] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [editingAnekdotId, setEditingAnekdotId] = useState<string>('');
  const [deskripsiKejadian, setDeskripsiKejadian] = useState('');
  const [anekdotNabp, setAnekdotNabp] = useState('');
  const [anekdotJd, setAnekdotJd] = useState('');
  const [anekdotLmstrs, setAnekdotLmstrs] = useState('');
  const [umpanBalik, setUmpanBalik] = useState('');
  const [anekdotFilterBulan, setAnekdotFilterBulan] = useState<string>('ALL');

  const handleSaveAnekdot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;
    if (!deskripsiKejadian.trim()) {
      addToast('Isi deskripsi kejadian terlebih dahulu.', 'error');
      return;
    }
    const taId = db.tahunAjaran.find((t) => t.status_aktif)?.ta_id || 'TA-2026-2027';
    const monthNum = Number(anekdotTanggal.split('-')[1] || '11');
    const record: AsesmenAnekdot = {
      anekdot_id: editingAnekdotId || `ANK-${Date.now()}`,
      tanggal: anekdotTanggal,
      periode_bulan: anekdotTanggal.slice(0, 7),
      semester: getSemesterFromMonth(monthNum),
      ta_id: taId,
      siswa_id: student.siswa_id,
      nama_anak: student.nama_anak,
      kelas: student.kelas_aktif,
      deskripsi_kejadian: deskripsiKejadian.trim(),
      analisis_nabp: anekdotNabp.trim(),
      analisis_jd: anekdotJd.trim(),
      analisis_lmstrs: anekdotLmstrs.trim(),
      umpan_balik: umpanBalik.trim(),
      guru_nama: currentUser?.nama_lengkap || 'Guru',
      updated_at: new Date().toISOString(),
    };

    await updateDb(
      (prev) => {
        const filtered = prev.asesmenAnekdot.filter((a) => a.anekdot_id !== record.anekdot_id);
        return { ...prev, asesmenAnekdot: [record, ...filtered] };
      },
      editingAnekdotId ? 'Catatan anekdot diperbarui.' : 'Catatan anekdot tersimpan.'
    );
    triggerCelebration(editingAnekdotId ? 'Anekdot diperbarui!' : 'Catatan anekdot tersimpan!');

    setEditingAnekdotId('');
    setDeskripsiKejadian('');
    setAnekdotNabp('');
    setAnekdotJd('');
    setAnekdotLmstrs('');
    setUmpanBalik('');
  };

  // ---- Sub-menu 2: Hasil Karya Anak (Max 3/month) ----
  const [karyaTanggal, setKaryaTanggal] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [karyaFotoDataUrl, setKaryaFotoDataUrl] = useState<string>('');
  const [karyaFotoSizeKb, setKaryaFotoSizeKb] = useState<number>(0);
  const [karyaFotoFallbackUrl, setKaryaFotoFallbackUrl] = useState<string>('');
  const [deskripsiKarya, setDeskripsiKarya] = useState('');
  const [karyaNabp, setKaryaNabp] = useState('');
  const [karyaJd, setKaryaJd] = useState('');
  const [karyaLmstrs, setKaryaLmstrs] = useState('');

  const karyaPeriodeBulan = karyaTanggal.slice(0, 7);
  const karyaQuota = useMemo(() => {
    if (!student) return { count: 0, remaining: MAX_HASIL_KARYA_PER_MONTH, isFull: false };
    return checkHasilKaryaMonthlyQuota(db.asesmenHasilKarya, student.siswa_id, karyaPeriodeBulan);
  }, [db.asesmenHasilKarya, student, karyaPeriodeBulan]);

  const handleCompressKaryaFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 800, 0.7);
      setKaryaFotoDataUrl(compressed.base64DataUrl);
      setKaryaFotoSizeKb(compressed.sizeKb);
      addToast(`Foto dikecilkan otomatis (${compressed.sizeKb} KB).`, 'info');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Gagal memproses foto.', 'error');
    }
  };

  const handleSaveHasilKarya = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;
    if (karyaQuota.isFull) {
      addToast(
        `Kuota ${MAX_HASIL_KARYA_PER_MONTH} foto bulan ${karyaPeriodeBulan} untuk ${student.nama_anak} sudah penuh.`,
        'error'
      );
      return;
    }
    const finalFotoUrl = karyaFotoDataUrl || sanitizeImageUrl(karyaFotoFallbackUrl);
    if (!finalFotoUrl || !deskripsiKarya.trim()) {
      addToast('Pilih foto karya dan isi ceritanya terlebih dahulu.', 'error');
      return;
    }
    const taId = db.tahunAjaran.find((t) => t.status_aktif)?.ta_id || 'TA-2026-2027';
    const monthNum = Number(karyaTanggal.split('-')[1] || '11');

    const newKarya: AsesmenHasilKarya = {
      karya_id: `KRY-${Date.now()}`,
      tanggal: karyaTanggal,
      periode_bulan: karyaPeriodeBulan,
      semester: getSemesterFromMonth(monthNum),
      ta_id: taId,
      siswa_id: student.siswa_id,
      nama_anak: student.nama_anak,
      kelas: student.kelas_aktif,
      foto_drive_id: '',
      foto_url: finalFotoUrl,
      deskripsi_karya: deskripsiKarya.trim(),
      analisis_nabp: karyaNabp.trim(),
      analisis_jd: karyaJd.trim(),
      analisis_lmstrs: karyaLmstrs.trim(),
      guru_nama: currentUser?.nama_lengkap || 'Guru',
      updated_at: new Date().toISOString(),
    };

    await updateDb(
      (prev) => ({
        ...prev,
        asesmenHasilKarya: [newKarya, ...prev.asesmenHasilKarya],
      }),
      `Hasil karya ${student.nama_anak} tersimpan.`
    );
    triggerCelebration('Karya anak tersimpan!');

    setKaryaFotoDataUrl('');
    setKaryaFotoSizeKb(0);
    setKaryaFotoFallbackUrl('');
    setDeskripsiKarya('');
    setKaryaNabp('');
    setKaryaJd('');
    setKaryaLmstrs('');
  };

  // ---- Sub-menu 3: Asesmen Ceklis (168 Master ATP) ----
  const [ceklisSemester, setCeklisSemester] = useState<SemesterType>('Semester 1');
  const [ceklisTanggal, setCeklisTanggal] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [ceklisElemen, setCeklisElemen] = useState<
    'Nilai Agama & Budi Pekerti' | 'Jati Diri' | 'Literasi & STEAM'
  >('Nilai Agama & Budi Pekerti');
  const [atpSearch, setAtpSearch] = useState('');
  const [selectedAtpUid, setSelectedAtpUid] = useState('');
  const [ceklisKonteks, setCeklisKonteks] = useState('');
  const [ceklisStatus, setCeklisStatus] = useState<'Belum Muncul' | 'Sudah Muncul'>('Sudah Muncul');
  const [ceklisKejadian, setCeklisKejadian] = useState('');
  const [ceklisMode, setCeklisMode] = useState<'input' | 'rekap'>('input');

  const studentKelompok =
    student && isKelasLanjutan(db, student.kelas_aktif) ? 'Kelompok B' : 'Kelompok A';

  const matchingAtpList = useMemo(() => {
    const q = atpSearch.trim().toLowerCase();
    return db.masterAtp.filter((a) => {
      if (!a.aktif) return false;
      if (a.kelompok !== studentKelompok) return false;
      if (a.semester_target !== 'Semester 1 & 2' && a.semester_target !== ceklisSemester) return false;
      if (a.elemen !== ceklisElemen) return false;
      if (q && !`${a.kode_atp} ${a.tujuan_pembelajaran}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [db.masterAtp, studentKelompok, ceklisSemester, ceklisElemen, atpSearch]);

  const activeAtp =
    matchingAtpList.find((a) => a.atp_uid === selectedAtpUid) || matchingAtpList[0] || null;

  const handleSaveCeklis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student || !activeAtp) return;
    if (!ceklisKonteks.trim() || !ceklisKejadian.trim()) {
      addToast('Isi kegiatan dan perilaku yang teramati.', 'error');
      return;
    }
    const taId = db.tahunAjaran.find((t) => t.status_aktif)?.ta_id || 'TA-2026-2027';
    const newCeklis: AsesmenCeklis = {
      ceklis_id: `CEK-${Date.now()}`,
      tanggal: ceklisTanggal,
      periode_bulan: ceklisTanggal.slice(0, 7),
      semester: ceklisSemester,
      ta_id: taId,
      siswa_id: student.siswa_id,
      nama_anak: student.nama_anak,
      kelas: student.kelas_aktif,
      elemen: ceklisElemen,
      kode_atp: activeAtp.kode_atp,
      tujuan_pembelajaran: activeAtp.tujuan_pembelajaran,
      konteks: ceklisKonteks.trim(),
      status_muncul: ceklisStatus,
      kejadian_teramati: ceklisKejadian.trim(),
      guru_nama: currentUser?.nama_lengkap || 'Guru',
      updated_at: new Date().toISOString(),
    };

    await updateDb(
      (prev) => ({ ...prev, asesmenCeklis: [newCeklis, ...prev.asesmenCeklis] }),
      `Ceklis ${activeAtp.kode_atp} untuk ${student.nama_anak} tersimpan.`
    );
    triggerCelebration('Ceklis ATP tersimpan!');
    setCeklisKonteks('');
    setCeklisKejadian('');
  };

  const rekapAtpSemester = useMemo(() => {
    if (!student) return [];
    const semesterAtps = db.masterAtp.filter(
      (a) =>
        a.aktif &&
        a.kelompok === studentKelompok &&
        (a.semester_target === 'Semester 1 & 2' || a.semester_target === ceklisSemester)
    );
    return semesterAtps.map((atp) => {
      const obs = db.asesmenCeklis.filter(
        (c) =>
          c.siswa_id === student.siswa_id &&
          c.semester === ceklisSemester &&
          c.kode_atp === atp.kode_atp
      );
      const latest = obs[0];
      return {
        atp,
        status: latest ? latest.status_muncul : 'Belum Diamati',
        latest,
      };
    });
  }, [db.masterAtp, db.asesmenCeklis, student, studentKelompok, ceklisSemester]);

  const studentAnekdot = useMemo(
    () =>
      db.asesmenAnekdot.filter(
        (a) =>
          (!student || a.siswa_id === student.siswa_id) &&
          (anekdotFilterBulan === 'ALL' || a.periode_bulan === anekdotFilterBulan)
      ),
    [db.asesmenAnekdot, student, anekdotFilterBulan]
  );

  const studentKarya = useMemo(
    () => db.asesmenHasilKarya.filter((k) => !student || k.siswa_id === student.siswa_id),
    [db.asesmenHasilKarya, student]
  );

  return (
    <div className="halaman">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3 mb-5">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl text-[#0f4527]">Catatan pengamatan anak</h1>
          <p className="text-sm text-[#55665a] mt-1">
            Catatan anekdot, foto hasil karya (maksimal {MAX_HASIL_KARYA_PER_MONTH} foto per bulan), dan ceklis tujuan pembelajaran.
          </p>
        </div>

        <MotionTabBar
          layoutId="guru-asesmen-tab-pill"
          ariaLabel="Pilih jenis pengamatan anak"
          className="self-start xl:self-auto"
          value={subMenu}
          onChange={setSubMenu}
          options={[
            {
              id: 'anekdot',
              label: 'Catatan anekdot',
              icon: <FileText className="w-3.5 h-3.5" />,
            },
            {
              id: 'karya',
              label: 'Hasil karya',
              icon: <Camera className="w-3.5 h-3.5" />,
            },
            {
              id: 'ceklis',
              label: 'Ceklis ATP',
              icon: <CheckSquare className="w-3.5 h-3.5" />,
            },
          ]}
        />
      </div>

      {/* Pilihan Anak */}
      <section className="kartu kartu-taktil flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 max-w-md">
          <label htmlFor="asesmen-siswa" className="block text-xs font-bold text-[#55665a] mb-1">
            Anak yang diamati
          </label>
          <select
            id="asesmen-siswa"
            value={student?.siswa_id || ''}
            onChange={(e) => setSelectedSiswaId(e.target.value)}
            className="isian-kontrol"
          >
            {availableStudents.map((s) => (
              <option key={s.siswa_id} value={s.siswa_id}>
                {s.nama_anak} ({s.kelas_aktif})
              </option>
            ))}
          </select>
        </div>
        {student && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="nilai">{studentKelompok}</span>
            <span className="nilai netral font-mono-tabular">NIS {student.nis}</span>
          </div>
        )}
      </section>

      {/* SUB-MENU 1: CATATAN ANEKDOT */}
      {subMenu === 'anekdot' && (
        <div>
          <form onSubmit={handleSaveAnekdot} className="kartu space-y-4">
            <div className="judul-baris">
              <h2 className="text-lg text-[#0f4527]">
                {editingAnekdotId ? 'Ubah catatan anekdot' : 'Tulis catatan anekdot'}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="anekdot-tgl" className="block text-xs font-bold text-[#55665a] mb-1">
                  Tanggal kejadian
                </label>
                <input
                  id="anekdot-tgl"
                  type="date"
                  value={anekdotTanggal}
                  onChange={(e) => setAnekdotTanggal(e.target.value)}
                  className="isian-kontrol font-mono-tabular"
                />
              </div>
            </div>

            <div>
              <label htmlFor="anekdot-desc" className="block text-xs font-bold text-[#55665a] mb-1">
                Kejadian atau ucapan yang teramati
              </label>
              <textarea
                id="anekdot-desc"
                rows={3}
                required
                value={deskripsiKejadian}
                onChange={(e) => setDeskripsiKejadian(e.target.value)}
                placeholder="Ceritakan peristiwa apa adanya yang dilakukan atau diucapkan anak..."
                className="isian-kontrol min-h-[84px]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#55665a] mb-1">
                  Nilai agama & budi pekerti
                </label>
                <textarea
                  rows={2}
                  value={anekdotNabp}
                  onChange={(e) => setAnekdotNabp(e.target.value)}
                  placeholder="Catatan singkat..."
                  className="isian-kontrol min-h-[68px] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#55665a] mb-1">Jati diri</label>
                <textarea
                  rows={2}
                  value={anekdotJd}
                  onChange={(e) => setAnekdotJd(e.target.value)}
                  placeholder="Catatan singkat..."
                  className="isian-kontrol min-h-[68px] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#55665a] mb-1">Literasi & STEAM</label>
                <textarea
                  rows={2}
                  value={anekdotLmstrs}
                  onChange={(e) => setAnekdotLmstrs(e.target.value)}
                  placeholder="Catatan singkat..."
                  className="isian-kontrol min-h-[68px] text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#55665a] mb-1">
                Tindak lanjut di sekolah dan rumah
              </label>
              <textarea
                rows={2}
                value={umpanBalik}
                onChange={(e) => setUmpanBalik(e.target.value)}
                placeholder="Dukungan yang bisa dilanjutkan oleh guru maupun orang tua..."
                className="isian-kontrol min-h-[68px]"
              />
            </div>

            <div className="flex justify-end gap-2">
              {editingAnekdotId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingAnekdotId('');
                    setDeskripsiKejadian('');
                    setAnekdotNabp('');
                    setAnekdotJd('');
                    setAnekdotLmstrs('');
                    setUmpanBalik('');
                  }}
                  className="tbl polos kecil"
                >
                  Batal ubah
                </button>
              )}
              <button type="submit" className="tbl">
                {editingAnekdotId ? 'Simpan perubahan' : 'Simpan catatan'}
              </button>
            </div>
          </form>

          <section className="kartu space-y-4">
            <div className="judul-baris">
              <h2 className="text-lg text-[#0f4527]">Riwayat catatan anekdot</h2>
              <select
                aria-label="Filter bulan anekdot"
                value={anekdotFilterBulan}
                onChange={(e) => setAnekdotFilterBulan(e.target.value)}
                className="isian-kontrol w-auto min-h-[38px] text-xs"
              >
                <option value="ALL">Semua bulan</option>
                <option value="2026-11">November 2026</option>
                <option value="2026-10">Oktober 2026</option>
              </select>
            </div>

            {studentAnekdot.length === 0 ? (
              <p className="kosong">Belum ada catatan anekdot untuk pilihan ini.</p>
            ) : (
              <div className="divide-y divide-[#d9d5c0]">
                {studentAnekdot.map((item) => (
                  <div key={item.anekdot_id} className="py-4 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#55665a]">
                      <span>
                        <strong className="text-[#1d2b21] font-mono-tabular">{item.tanggal}</strong> ·{' '}
                        {item.semester} · {item.guru_nama}
                      </span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAnekdotId(item.anekdot_id);
                            setAnekdotTanggal(item.tanggal);
                            setDeskripsiKejadian(item.deskripsi_kejadian);
                            setAnekdotNabp(item.analisis_nabp);
                            setAnekdotJd(item.analisis_jd);
                            setAnekdotLmstrs(item.analisis_lmstrs);
                            setUmpanBalik(item.umpan_balik);
                          }}
                          className="font-bold text-[#176238] hover:underline cursor-pointer"
                        >
                          Ubah
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateDb(
                              (prev) => ({
                                ...prev,
                                asesmenAnekdot: prev.asesmenAnekdot.filter(
                                  (a) => a.anekdot_id !== item.anekdot_id
                                ),
                              }),
                              'Catatan anekdot dihapus.'
                            )
                          }
                          className="font-bold text-[#a33a25] hover:underline cursor-pointer"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-[#1d2b21]">{item.deskripsi_kejadian}</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-[#55665a] bg-[#fbf6e7] p-3 rounded-xl border border-[#d9d5c0]">
                      <div>
                        <strong className="text-[#1d2b21]">Agama & Budi Pekerti:</strong>{' '}
                        {item.analisis_nabp || '-'}
                      </div>
                      <div>
                        <strong className="text-[#1d2b21]">Jati Diri:</strong> {item.analisis_jd || '-'}
                      </div>
                      <div>
                        <strong className="text-[#1d2b21]">Literasi & STEAM:</strong>{' '}
                        {item.analisis_lmstrs || '-'}
                      </div>
                    </div>
                    {item.umpan_balik && (
                      <p className="text-xs text-[#0f4527]">
                        <strong>Tindak lanjut:</strong> {item.umpan_balik}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* SUB-MENU 2: HASIL KARYA ANAK */}
      {subMenu === 'karya' && (
        <div>
          <form onSubmit={handleSaveHasilKarya} className="kartu space-y-4">
            <div className="judul-baris pb-3 border-b border-[#d9d5c0]">
              <div>
                <h2 className="text-lg text-[#0f4527]">Unggah hasil karya anak</h2>
                <p className="text-xs text-[#55665a] mt-0.5">
                  Foto otomatis dikecilkan ke 800px agar hemat ruang penyimpanan sekolah.
                </p>
              </div>
              <span className={`nilai ${karyaQuota.isFull ? 'merah' : ''}`}>
                Kuota {karyaPeriodeBulan}: {karyaQuota.count}/{MAX_HASIL_KARYA_PER_MONTH} foto
              </span>
            </div>

            {karyaQuota.isFull && (
              <div className="p-3 rounded-xl bg-[#fdeab5] border border-[#f2b632] text-xs text-[#7c4d03] font-semibold">
                Kuota bulan ini (3 dari 3 foto) sudah penuh untuk {student?.nama_anak}. Hapus salah satu foto di galeri bawah jika ingin mengganti.
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="karya-tgl" className="block text-xs font-bold text-[#55665a] mb-1">
                  Tanggal karya
                </label>
                <input
                  id="karya-tgl"
                  type="date"
                  value={karyaTanggal}
                  onChange={(e) => setKaryaTanggal(e.target.value)}
                  className="isian-kontrol font-mono-tabular"
                />
              </div>

              <div>
                <label htmlFor="karya-upload" className="block text-xs font-bold text-[#55665a] mb-1">
                  Foto karya anak
                </label>
                <label
                  htmlFor="karya-upload"
                  className={`min-h-[44px] px-3 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 text-xs font-bold cursor-pointer transition-colors ${
                    karyaQuota.isFull
                      ? 'border-[#d9d5c0] bg-[#fbf6e7] text-[#55665a] pointer-events-none opacity-60'
                      : 'border-[#176238] bg-[#dcebd2]/40 text-[#0f4527] hover:bg-[#dcebd2]'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  <span>
                    {karyaFotoSizeKb > 0
                      ? `Foto siap (${karyaFotoSizeKb} KB)`
                      : 'Pilih foto dari perangkat'}
                  </span>
                </label>
                <input
                  id="karya-upload"
                  type="file"
                  accept="image/*"
                  disabled={karyaQuota.isFull}
                  onChange={handleCompressKaryaFile}
                  className="sr-only"
                />
              </div>
            </div>

            <div>
              <label htmlFor="karya-url-fallback" className="block text-xs font-bold text-[#55665a] mb-1">
                Atau tempel tautan foto Drive (opsional)
              </label>
              <input
                id="karya-url-fallback"
                type="url"
                disabled={karyaQuota.isFull}
                value={karyaFotoFallbackUrl}
                onChange={(e) => setKaryaFotoFallbackUrl(e.target.value)}
                placeholder="https://drive.google.com/thumbnail?id=..."
                className="isian-kontrol text-xs"
              />
            </div>

            {karyaFotoDataUrl && (
              <div className="w-52 rounded-xl overflow-hidden border border-[#d9d5c0]">
                <img
                  src={karyaFotoDataUrl}
                  alt="Pratinjau foto hasil karya anak"
                  className="w-full h-36 object-cover"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#55665a] mb-1">
                Cerita di balik karya anak
              </label>
              <textarea
                rows={2}
                required
                value={deskripsiKarya}
                onChange={(e) => setDeskripsiKarya(e.target.value)}
                placeholder="Tuliskan karya yang dibuat dan ucapan anak tentang karyanya..."
                className="isian-kontrol min-h-[72px]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#55665a] mb-1">
                  Agama & Budi Pekerti
                </label>
                <textarea
                  rows={2}
                  value={karyaNabp}
                  onChange={(e) => setKaryaNabp(e.target.value)}
                  className="isian-kontrol min-h-[64px] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#55665a] mb-1">Jati Diri</label>
                <textarea
                  rows={2}
                  value={karyaJd}
                  onChange={(e) => setKaryaJd(e.target.value)}
                  className="isian-kontrol min-h-[64px] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#55665a] mb-1">Literasi & STEAM</label>
                <textarea
                  rows={2}
                  value={karyaLmstrs}
                  onChange={(e) => setKaryaLmstrs(e.target.value)}
                  className="isian-kontrol min-h-[64px] text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button type="submit" disabled={karyaQuota.isFull} className="tbl">
                Simpan hasil karya
              </button>
            </div>
          </form>

          {/* Galeri Hasil Karya */}
          <section className="kartu">
            <div className="judul-baris">
              <h2 className="text-lg text-[#0f4527]">Galeri karya {student?.nama_anak}</h2>
            </div>
            {studentKarya.length === 0 ? (
              <p className="kosong">Belum ada foto hasil karya untuk anak ini.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {studentKarya.map((k) => (
                  <article
                    key={k.karya_id}
                    className="galeri-foto rounded-2xl border border-[#d9d5c0] bg-[#fbf6e7] overflow-hidden flex flex-col"
                  >
                    <img
                      src={k.foto_url}
                      alt={k.deskripsi_karya}
                      referrerPolicy="no-referrer"
                      className="w-full h-44 object-cover bg-[#f0ead7]"
                    />
                    <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-xs text-[#55665a]">
                          <span className="font-mono-tabular">{k.tanggal}</span>
                          <button
                            type="button"
                            onClick={() =>
                              updateDb(
                                (prev) => ({
                                  ...prev,
                                  asesmenHasilKarya: prev.asesmenHasilKarya.filter(
                                    (x) => x.karya_id !== k.karya_id
                                  ),
                                }),
                                'Foto karya dihapus.'
                              )
                            }
                            aria-label="Hapus foto hasil karya"
                            className="text-[#a33a25] font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hapus</span>
                          </button>
                        </div>
                        <p className="mt-1.5 text-sm font-semibold text-[#1d2b21]">
                          {k.deskripsi_karya}
                        </p>
                      </div>
                      {(k.analisis_nabp || k.analisis_jd || k.analisis_lmstrs) && (
                        <div className="text-xs text-[#55665a] space-y-0.5 pt-2 border-t border-[#d9d5c0]">
                          {k.analisis_nabp && (
                            <p>
                              <strong className="text-[#1d2b21]">Agama:</strong> {k.analisis_nabp}
                            </p>
                          )}
                          {k.analisis_jd && (
                            <p>
                              <strong className="text-[#1d2b21]">Jati diri:</strong> {k.analisis_jd}
                            </p>
                          )}
                          {k.analisis_lmstrs && (
                            <p>
                              <strong className="text-[#1d2b21]">STEAM:</strong> {k.analisis_lmstrs}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* SUB-MENU 3: ASESMEN CEKLIS ATP */}
      {subMenu === 'ceklis' && (
        <div className="space-y-4">
          <div className="tab-bar">
            <button
              type="button"
              onClick={() => setCeklisMode('input')}
              className={`tab-btn ${ceklisMode === 'input' ? 'aktif' : ''}`}
            >
              Catat pengamatan
            </button>
            <button
              type="button"
              onClick={() => setCeklisMode('rekap')}
              className={`tab-btn ${ceklisMode === 'rekap' ? 'aktif' : ''}`}
            >
              Rekap per anak ({rekapAtpSemester.length} ATP)
            </button>
          </div>

          {ceklisMode === 'input' ? (
            <form onSubmit={handleSaveCeklis} className="kartu space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#55665a] mb-1">Semester</label>
                  <select
                    value={ceklisSemester}
                    onChange={(e) => setCeklisSemester(e.target.value as SemesterType)}
                    className="isian-kontrol"
                  >
                    <option value="Semester 1">Semester 1</option>
                    <option value="Semester 2">Semester 2</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#55665a] mb-1">
                    Tanggal pengamatan
                  </label>
                  <input
                    type="date"
                    value={ceklisTanggal}
                    onChange={(e) => setCeklisTanggal(e.target.value)}
                    className="isian-kontrol font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#55665a] mb-1">
                    Elemen capaian
                  </label>
                  <select
                    value={ceklisElemen}
                    onChange={(e) =>
                      setCeklisElemen(
                        e.target.value as
                          | 'Nilai Agama & Budi Pekerti'
                          | 'Jati Diri'
                          | 'Literasi & STEAM'
                      )
                    }
                    className="isian-kontrol"
                  >
                    <option value="Nilai Agama & Budi Pekerti">Nilai Agama & Budi Pekerti</option>
                    <option value="Jati Diri">Jati Diri</option>
                    <option value="Literasi & STEAM">Literasi & STEAM</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label htmlFor="select-atp" className="text-xs font-bold text-[#55665a]">
                    Tujuan pembelajaran ({studentKelompok} · {ceklisSemester} · {matchingAtpList.length} indikator)
                  </label>
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-[#55665a] absolute left-3 top-3.5" />
                    <input
                      type="text"
                      value={atpSearch}
                      onChange={(e) => setAtpSearch(e.target.value)}
                      placeholder="Cari kode atau kalimat ATP..."
                      className="isian-kontrol min-h-[38px] pl-8 text-xs"
                    />
                  </div>
                </div>
                <select
                  id="select-atp"
                  value={activeAtp?.atp_uid || ''}
                  onChange={(e) => setSelectedAtpUid(e.target.value)}
                  className="isian-kontrol"
                >
                  {matchingAtpList.map((a) => (
                    <option key={a.atp_uid} value={a.atp_uid}>
                      [{a.kode_atp}] {a.tujuan_pembelajaran}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#55665a] mb-1">
                    Kegiatan saat diamati
                  </label>
                  <input
                    type="text"
                    required
                    value={ceklisKonteks}
                    onChange={(e) => setCeklisKonteks(e.target.value)}
                    placeholder="Contoh: Sentra Balok, Jurnal Pagi, Makan Bekal"
                    className="isian-kontrol"
                  />
                </div>
                <div>
                  <span className="block text-xs font-bold text-[#55665a] mb-1">
                    Status kemunculan
                  </span>
                  <div className="grid grid-cols-2 gap-2" role="radiogroup">
                    {(['Sudah Muncul', 'Belum Muncul'] as const).map((st) => {
                      const aktif = ceklisStatus === st;
                      return (
                        <button
                          key={st}
                          type="button"
                          role="radio"
                          aria-checked={aktif}
                          onClick={() => setCeklisStatus(st)}
                          className={`min-h-[44px] rounded-xl border-2 text-xs font-extrabold cursor-pointer transition-colors ${
                            aktif
                              ? st === 'Sudah Muncul'
                                ? 'bg-[#176238] text-white border-[#176238]'
                                : 'bg-[#f2b632] text-[#1d2b21] border-[#f2b632]'
                              : 'bg-white text-[#55665a] border-[#d9d5c0]'
                          }`}
                        >
                          {st}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#55665a] mb-1">
                  Perilaku yang teramati
                </label>
                <textarea
                  rows={2}
                  required
                  value={ceklisKejadian}
                  onChange={(e) => setCeklisKejadian(e.target.value)}
                  placeholder="Tuliskan perilaku nyata anak saat indikator muncul..."
                  className="isian-kontrol min-h-[72px]"
                />
              </div>

              <div className="flex justify-end">
                <button type="submit" className="tbl">
                  Simpan ceklis ATP
                </button>
              </div>
            </form>
          ) : (
            <section className="kartu space-y-4">
              <div className="judul-baris">
                <h2 className="text-lg text-[#0f4527]">
                  Rekap ceklis {student?.nama_anak} ({studentKelompok} · {ceklisSemester})
                </h2>
                <select
                  aria-label="Semester rekap ceklis"
                  value={ceklisSemester}
                  onChange={(e) => setCeklisSemester(e.target.value as SemesterType)}
                  className="isian-kontrol w-auto min-h-[38px] text-xs"
                >
                  <option value="Semester 1">Semester 1</option>
                  <option value="Semester 2">Semester 2</option>
                </select>
              </div>

              <div className="geser">
                <table className="tabel-bersih">
                  <thead>
                    <tr>
                      <th>Kode</th>
                      <th>Elemen</th>
                      <th>Tujuan pembelajaran</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rekapAtpSemester.map((row) => (
                      <tr key={row.atp.atp_uid}>
                        <td className="font-mono-tabular font-bold text-[#1d2b21] whitespace-nowrap">
                          {row.atp.kode_atp}
                        </td>
                        <td className="text-[#55665a] whitespace-nowrap">{row.atp.elemen}</td>
                        <td className="text-[#1d2b21]">{row.atp.tujuan_pembelajaran}</td>
                        <td className="whitespace-nowrap">
                          <span
                            className={
                              row.status === 'Sudah Muncul'
                                ? 'sudah'
                                : row.status === 'Belum Muncul'
                                ? 'belum'
                                : 'text-[#55665a] text-xs'
                            }
                          >
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};
