import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  AntropometriRecord,
  KeagamaanRecord,
  LiterasiRecord,
  SkalaLiterasi,
  StatusKeagamaan,
  TrackKelasB,
  UlasanOrtu,
} from '../../types';
import { calculateAgeInMonths, evaluateAnthropometry } from '../../utils/anthropometry';
import { AnthropometryChart } from '../common/AnthropometryChart';

const SKALA_LITERASI_OPTS: SkalaLiterasi[] = [
  'Belum Berkembang (BB)',
  'Mulai Berkembang (MB)',
  'Berkembang Sesuai Harapan (BSH)',
  'Berkembang Sangat Baik (BSB)',
];

const TRACK_B_OPTS: { value: TrackKelasB; label: string }[] = [
  { value: 'TRACK_1', label: 'Penguatan Dasar: huruf dan suku kata KV' },
  { value: 'TRACK_2', label: 'Reguler: suku kata lanjutan KVK & ng/ny' },
  { value: 'TRACK_3', label: 'Lanjutan: kalimat sederhana' },
  { value: 'TRACK_4', label: 'Next Level: paragraf pendek dan bercerita' },
  { value: 'KUSTOM', label: 'Target kustom' },
];

const STATUS_KEAGAMAAN_OPTS: StatusKeagamaan[] = [
  'Baru Mengenalkan',
  'Menirukan',
  'Hafal/Lancar dengan Bantuan',
  'Hafal/Lancar Mandiri',
];

export const AntropometriKeagamaanView: React.FC = () => {
  const { db, currentUser, updateDb, addToast } = useApp();

  const availableStudents = useMemo(() => {
    return db.siswa.filter((s) => {
      if (s.status_siswa !== 'Aktif') return false;
      if (currentUser?.role === 'Guru' && currentUser.kelas_ampu) {
        return s.kelas_aktif === currentUser.kelas_ampu;
      }
      return true;
    });
  }, [db.siswa, currentUser]);

  const [selectedSiswaId, setSelectedSiswaId] = useState<string>(
    () => availableStudents[0]?.siswa_id || ''
  );
  const [subTab, setSubTab] = useState<'antro' | 'literasi' | 'keagamaan' | 'ulasan'>('antro');
  const [periodeBulan, setPeriodeBulan] = useState<string>('2026-11');

  const student = useMemo(
    () => availableStudents.find((s) => s.siswa_id === selectedSiswaId) || availableStudents[0],
    [availableStudents, selectedSiswaId]
  );

  // Antropometri form state
  const [bbKg, setBbKg] = useState<string>('16.8');
  const [tbCm, setTbCm] = useState<string>('105.2');
  const [lkCm, setLkCm] = useState<string>('50.1');
  const [lilaCm, setLilaCm] = useState<string>('16.5');
  const [antroCatatan, setAntroCatatan] = useState<string>('');

  const studentAntro = useMemo(
    () =>
      db.antropometri
        .filter((a) => !student || a.siswa_id === student.siswa_id)
        .sort((a, b) => a.periode_bulan.localeCompare(b.periode_bulan)),
    [db.antropometri, student]
  );

  const handleSaveAntro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;
    const bb = parseFloat(bbKg);
    const tb = parseFloat(tbCm);
    const lk = parseFloat(lkCm);
    const lila = parseFloat(lilaCm);
    if ([bb, tb, lk, lila].some((v) => Number.isNaN(v) || v <= 0)) {
      addToast('Pastikan seluruh angka BB, TB, LK, dan LiLA valid.', 'error');
      return;
    }

    const usiaBulan = calculateAgeInMonths(student.tanggal_lahir, `${periodeBulan}-15`);
    const prevRecord = [...studentAntro]
      .filter((a) => a.periode_bulan < periodeBulan)
      .pop();

    const evalRes = evaluateAnthropometry({
      usiaBulan,
      jenisKelamin: student.jenis_kelamin,
      bbKg: bb,
      tbCm: tb,
      lkCm: lk,
      lilaCm: lila,
      prevBbKg: prevRecord?.bb_kg,
      prevTbCm: prevRecord?.tb_cm,
    });

    const taId = db.tahunAjaran.find((t) => t.status_aktif)?.ta_id || 'TA-2026-2027';
    const record: AntropometriRecord = {
      log_id: `ANT-${periodeBulan}-${student.siswa_id}`,
      siswa_id: student.siswa_id,
      ta_id: taId,
      periode_bulan: periodeBulan,
      usia_bulan: usiaBulan,
      bb_kg: bb,
      tb_cm: tb,
      lk_cm: lk,
      lila_cm: lila,
      status_gizi_otomatis: evalRes.statusGizi,
      kode_pemicu_tips: evalRes.kodePemicuTips,
      catatan_guru: antroCatatan.trim() || evalRes.summaryNote,
      updated_at: new Date().toISOString(),
    };

    await updateDb((prev) => {
      const rest = prev.antropometri.filter(
        (a) => !(a.siswa_id === student.siswa_id && a.periode_bulan === periodeBulan)
      );
      return { ...prev, antropometri: [...rest, record] };
    }, 'Tersimpan');
    setAntroCatatan('');
  };

  // Literasi & Track B form
  const [trackB, setTrackB] = useState<TrackKelasB>(
    () => student?.target_literasi_kelas_b || 'TRACK_1'
  );
  const [targetKustom, setTargetKustom] = useState<string>('');
  const [nilaiDasar, setNilaiDasar] = useState<SkalaLiterasi>('Berkembang Sesuai Harapan (BSH)');
  const [nilaiLanjutan, setNilaiLanjutan] = useState<SkalaLiterasi>('Mulai Berkembang (MB)');
  const [nilaiKalimat, setNilaiKalimat] = useState<SkalaLiterasi>('Berkembang Sesuai Harapan (BSH)');
  const [litCatatan, setLitCatatan] = useState<string>('');

  const handleSaveLiterasi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;
    const taId = db.tahunAjaran.find((t) => t.status_aktif)?.ta_id || 'TA-2026-2027';
    const isKelasB = student.kelas_aktif === 'Kelas B';

    const litRecord: LiterasiRecord = {
      lit_id: `LIT-${periodeBulan}-${student.siswa_id}`,
      siswa_id: student.siswa_id,
      ta_id: taId,
      periode_bulan: periodeBulan,
      kelas: isKelasB ? 'Kelas B' : 'Kelas A',
      track_level_dipilih: isKelasB ? trackB : 'STANDAR_A',
      target_kustom: isKelasB && trackB === 'KUSTOM' ? targetKustom.trim() : '',
      nilai_huruf_atau_dasar: nilaiDasar,
      nilai_sukukata_atau_lanjutan: nilaiLanjutan,
      nilai_kalimat_opsional: isKelasB ? nilaiKalimat : '',
      catatan_guru: litCatatan.trim(),
      updated_at: new Date().toISOString(),
    };

    await updateDb((prev) => {
      const restLit = prev.literasi.filter(
        (l) => !(l.siswa_id === student.siswa_id && l.periode_bulan === periodeBulan)
      );
      const updatedSiswa = prev.siswa.map((s) =>
        s.siswa_id === student.siswa_id && isKelasB
          ? {
              ...s,
              target_literasi_kelas_b: trackB,
              target_kustom_kelas_b: trackB === 'KUSTOM' ? targetKustom.trim() : '',
            }
          : s
      );
      return {
        ...prev,
        siswa: updatedSiswa,
        literasi: [...restLit, litRecord],
      };
    }, 'Tersimpan');
    setLitCatatan('');
  };

  // Keagamaan form
  const [agamaKategori, setAgamaKategori] = useState<
    'Surat Pendek' | 'Doa Harian' | 'Hijaiyah / Iqra' | 'Hadits Pendek'
  >('Surat Pendek');
  const [materiId, setMateriId] = useState<string>('SRT-01');
  const [statusProgres, setStatusProgres] = useState<StatusKeagamaan>('Hafal/Lancar dengan Bantuan');
  const [agamaCatatan, setAgamaCatatan] = useState<string>('');

  const filteredMasterMateri = useMemo(() => {
    return db.masterMateri.filter((m) => m.aktif && m.kategori === agamaKategori);
  }, [db.masterMateri, agamaKategori]);

  const handleSaveKeagamaan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;
    const picked =
      filteredMasterMateri.find((m) => m.materi_id === materiId) || filteredMasterMateri[0];
    if (!picked) return;
    const taId = db.tahunAjaran.find((t) => t.status_aktif)?.ta_id || 'TA-2026-2027';

    const record: KeagamaanRecord = {
      agama_id: `AGM-${Date.now()}`,
      siswa_id: student.siswa_id,
      ta_id: taId,
      periode_bulan: periodeBulan,
      kategori: agamaKategori,
      materi_id: picked.materi_id,
      nama_materi: picked.nama_materi,
      status_progres: statusProgres,
      catatan_guru: agamaCatatan.trim(),
      updated_at: new Date().toISOString(),
    };

    await updateDb(
      (prev) => ({ ...prev, keagamaan: [record, ...prev.keagamaan] }),
      'Tersimpan'
    );
    setAgamaCatatan('');
  };

  // Ulasan reply
  const [replyText, setReplyText] = useState('');
  const handleReplyUlasan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student || !replyText.trim()) return;
    const taId = db.tahunAjaran.find((t) => t.status_aktif)?.ta_id || 'TA-2026-2027';
    const newMsg: UlasanOrtu = {
      ulasan_id: `ULS-${Date.now()}`,
      siswa_id: student.siswa_id,
      ta_id: taId,
      periode_bulan: periodeBulan,
      pengirim_role: 'Guru',
      pengirim_nama: currentUser?.nama_lengkap || 'Guru Kelas',
      isi_pesan: replyText.trim(),
      created_at: new Date().toISOString(),
    };
    await updateDb(
      (prev) => ({ ...prev, ulasanOrtu: [...prev.ulasanOrtu, newMsg] }),
      'Pesan terkirim'
    );
    setReplyText('');
  };

  const ulasanList = db.ulasanOrtu.filter((u) => !student || u.siswa_id === student.siswa_id);
  const agamaList = db.keagamaan.filter((k) => !student || k.siswa_id === student.siswa_id);

  return (
    <div className="space-y-6">
      {/* Selector Row + Segmented Tabs */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block min-w-[200px]">
            <span className="block font-extrabold text-xs text-[#55665a] mb-1">Anak</span>
            <select
              value={student?.siswa_id || ''}
              onChange={(e) => {
                const nextId = e.target.value;
                setSelectedSiswaId(nextId);
                const nextSt = availableStudents.find((s) => s.siswa_id === nextId);
                if (nextSt) {
                  setTrackB(nextSt.target_literasi_kelas_b);
                  setTargetKustom(nextSt.target_kustom_kelas_b || '');
                }
              }}
              className="isian-kontrol"
            >
              {availableStudents.map((s) => (
                <option key={s.siswa_id} value={s.siswa_id}>
                  {s.nama_anak} ({s.kelas_aktif})
                </option>
              ))}
            </select>
          </label>
          <label className="block w-44">
            <span className="block font-extrabold text-xs text-[#55665a] mb-1">Bulan</span>
            <input
              type="month"
              value={periodeBulan}
              onChange={(e) => setPeriodeBulan(e.target.value)}
              className="isian-kontrol font-mono-tabular"
            />
          </label>
        </div>

        <div className="tab-bar">
          {[
            { id: 'antro', label: 'Tumbuh' },
            { id: 'literasi', label: 'Literasi' },
            { id: 'keagamaan', label: 'Agama' },
            { id: 'ulasan', label: 'Diskusi' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id as typeof subTab)}
              className={`tab-btn ${subTab === t.id ? 'aktif' : ''}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {student && (
        <div className="identitas">
          <span className="inisial" aria-hidden="true">
            {student.nama_anak.charAt(0)}
          </span>
          <div>
            <h1 className="text-2xl text-[#0f4527]">{student.nama_anak}</h1>
            <p className="text-sm text-[#1d2b21]">
              NIS {student.nis}, {student.kelas_aktif}
            </p>
          </div>
        </div>
      )}

      {/* ANTROPOMETRI */}
      {subTab === 'antro' && (
        <div className="space-y-5">
          <form onSubmit={handleSaveAntro} className="kartu space-y-4">
            <h2 className="text-xl text-[#0f4527]">Pengukuran {periodeBulan}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <label className="block">
                <span className="block font-extrabold text-xs mb-1">Berat badan (kg)</span>
                <input
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  required
                  value={bbKg}
                  onChange={(e) => setBbKg(e.target.value)}
                  className="isian-kontrol font-mono-tabular"
                />
              </label>
              <label className="block">
                <span className="block font-extrabold text-xs mb-1">Tinggi badan (cm)</span>
                <input
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  required
                  value={tbCm}
                  onChange={(e) => setTbCm(e.target.value)}
                  className="isian-kontrol font-mono-tabular"
                />
              </label>
              <label className="block">
                <span className="block font-extrabold text-xs mb-1">Lingkar kepala (cm)</span>
                <input
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  required
                  value={lkCm}
                  onChange={(e) => setLkCm(e.target.value)}
                  className="isian-kontrol font-mono-tabular"
                />
              </label>
              <label className="block">
                <span className="block font-extrabold text-xs mb-1">LiLA (cm)</span>
                <input
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  required
                  value={lilaCm}
                  onChange={(e) => setLilaCm(e.target.value)}
                  className="isian-kontrol font-mono-tabular"
                />
              </label>
            </div>
            <label className="block">
              <span className="block font-extrabold text-xs mb-1">Catatan guru</span>
              <textarea
                rows={2}
                value={antroCatatan}
                onChange={(e) => setAntroCatatan(e.target.value)}
                placeholder="Kosongkan untuk memakai ringkasan otomatis..."
                className="isian-kontrol"
              />
            </label>
            <button type="submit" className="tbl">
              Simpan
            </button>
          </form>

          <section className="kartu space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl text-[#0f4527]">Bagaimana pertumbuhan tiap bulan?</h2>
              {studentAntro.length > 0 && (
                <span className="nilai">
                  {studentAntro[studentAntro.length - 1].status_gizi_otomatis}
                </span>
              )}
            </div>
            <AnthropometryChart records={studentAntro} studentName={student?.nama_anak || ''} />
            {studentAntro.length > 0 && (
              <div className="overflow-x-auto pt-2">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-[#d9d5c0] text-xs text-[#55665a]">
                      <th className="py-2 px-2 text-left">Bulan</th>
                      <th className="py-2 px-2 text-left">Usia</th>
                      <th className="py-2 px-2 text-left">BB</th>
                      <th className="py-2 px-2 text-left">TB</th>
                      <th className="py-2 px-2 text-left">LK</th>
                      <th className="py-2 px-2 text-left">LiLA</th>
                      <th className="py-2 px-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentAntro.map((a) => (
                      <tr key={a.log_id} className="border-b border-[#d9d5c0]">
                        <td className="py-2 px-2 font-mono-tabular">{a.periode_bulan}</td>
                        <td className="py-2 px-2">{a.usia_bulan} bln</td>
                        <td className="py-2 px-2 font-mono-tabular">{a.bb_kg}</td>
                        <td className="py-2 px-2 font-mono-tabular">{a.tb_cm}</td>
                        <td className="py-2 px-2 font-mono-tabular">{a.lk_cm}</td>
                        <td className="py-2 px-2 font-mono-tabular">{a.lila_cm}</td>
                        <td className="py-2 px-2 font-bold text-[#176238]">
                          {a.status_gizi_otomatis}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-xs text-[#55665a]">
              Status memakai batas penyaringan sederhana dan bukan diagnosis. Untuk penilaian lengkap, hubungi tenaga kesehatan.
            </p>
          </section>
        </div>
      )}

      {/* LITERASI & TRACK B */}
      {subTab === 'literasi' && (
        <form onSubmit={handleSaveLiterasi} className="kartu space-y-4">
          <div>
            <h2 className="text-xl text-[#0f4527]">Penilaian literasi ({student?.kelas_aktif})</h2>
            <p className="text-xs text-[#55665a]">
              {student?.kelas_aktif === 'Kelas B'
                ? 'Pilih atau sesuaikan target belajar pribadi anak.'
                : 'Pengenalan huruf A–Z dan suku kata mudah (KV).'}
            </p>
          </div>

          {student?.kelas_aktif === 'Kelas B' && (
            <div className="space-y-3 rounded-[14px] border border-[#c2d7b4] bg-[#dcebd2]/45 p-4">
              <label className="block">
                <span className="block font-extrabold text-xs text-[#0f4527] mb-1">
                  Target belajar anak
                </span>
                <select
                  value={trackB}
                  onChange={(e) => setTrackB(e.target.value as TrackKelasB)}
                  className="isian-kontrol"
                >
                  {TRACK_B_OPTS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              {trackB === 'KUSTOM' && (
                <label className="block">
                  <span className="block font-extrabold text-xs text-[#0f4527] mb-1">
                    Tulis target kustom
                  </span>
                  <input
                    type="text"
                    required
                    value={targetKustom}
                    onChange={(e) => setTargetKustom(e.target.value)}
                    placeholder="Contoh: Membaca kata berakhiran -ng dengan lancar"
                    className="isian-kontrol"
                  />
                </label>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="block">
              <span className="block font-extrabold text-xs mb-1">
                {student?.kelas_aktif === 'Kelas B' ? 'Kemampuan dasar' : 'Pengenalan huruf A-Z'}
              </span>
              <select
                value={nilaiDasar}
                onChange={(e) => setNilaiDasar(e.target.value as SkalaLiterasi)}
                className="isian-kontrol"
              >
                {SKALA_LITERASI_OPTS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="block font-extrabold text-xs mb-1">
                {student?.kelas_aktif === 'Kelas B' ? 'Kemampuan lanjutan' : 'Suku kata mudah (KV)'}
              </span>
              <select
                value={nilaiLanjutan}
                onChange={(e) => setNilaiLanjutan(e.target.value as SkalaLiterasi)}
                className="isian-kontrol"
              >
                {SKALA_LITERASI_OPTS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </label>

            {student?.kelas_aktif === 'Kelas B' && (
              <label className="block">
                <span className="block font-extrabold text-xs mb-1">Kalimat (opsional)</span>
                <select
                  value={nilaiKalimat}
                  onChange={(e) => setNilaiKalimat(e.target.value as SkalaLiterasi)}
                  className="isian-kontrol"
                >
                  {SKALA_LITERASI_OPTS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <label className="block">
            <span className="block font-extrabold text-xs mb-1">Catatan guru</span>
            <textarea
              rows={2}
              value={litCatatan}
              onChange={(e) => setLitCatatan(e.target.value)}
              className="isian-kontrol"
            />
          </label>

          <button type="submit" className="tbl">
            Simpan
          </button>
        </form>
      )}

      {/* KEAGAMAAN */}
      {subTab === 'keagamaan' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <form onSubmit={handleSaveKeagamaan} className="lg:col-span-5 kartu space-y-3.5">
            <h2 className="text-xl text-[#0f4527]">Nilai materi, {periodeBulan}</h2>

            <label className="block">
              <span className="block font-extrabold text-xs mb-1">Kategori</span>
              <select
                value={agamaKategori}
                onChange={(e) => {
                  const kat = e.target.value as typeof agamaKategori;
                  setAgamaKategori(kat);
                  const first = db.masterMateri.find((m) => m.kategori === kat);
                  if (first) setMateriId(first.materi_id);
                }}
                className="isian-kontrol"
              >
                <option value="Surat Pendek">Surat Pendek</option>
                <option value="Doa Harian">Doa Harian</option>
                <option value="Hijaiyah / Iqra">Hijaiyah / Iqra</option>
                <option value="Hadits Pendek">Hadits Pendek</option>
              </select>
            </label>

            <label className="block">
              <span className="block font-extrabold text-xs mb-1">Materi</span>
              <select
                value={materiId}
                onChange={(e) => setMateriId(e.target.value)}
                className="isian-kontrol"
              >
                {filteredMasterMateri.map((m) => (
                  <option key={m.materi_id} value={m.materi_id}>
                    {m.nama_materi}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="block font-extrabold text-xs mb-1">Status progres</span>
              <select
                value={statusProgres}
                onChange={(e) => setStatusProgres(e.target.value as StatusKeagamaan)}
                className="isian-kontrol"
              >
                {STATUS_KEAGAMAAN_OPTS.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="block font-extrabold text-xs mb-1">
                Catatan guru {agamaKategori === 'Hijaiyah / Iqra' ? '(Halaman Iqra terakhir)' : ''}
              </span>
              <textarea
                rows={2}
                value={agamaCatatan}
                onChange={(e) => setAgamaCatatan(e.target.value)}
                placeholder={agamaKategori === 'Hijaiyah / Iqra' ? 'Contoh: Iqra 2 halaman 14' : 'Catatan hafalan...'}
                className="isian-kontrol"
              />
            </label>

            <button type="submit" className="tbl">
              Simpan
            </button>
          </form>

          <section className="lg:col-span-7 kartu space-y-3">
            <h2 className="text-xl text-[#0f4527]">Bacaan dan keagamaan</h2>
            {agamaList.length === 0 ? (
              <p className="kosong">Belum ada materi keagamaan yang dinilai.</p>
            ) : (
              <ul className="daftar">
                {agamaList.map((k) => (
                  <li key={k.agama_id}>
                    <div>
                      <small className="text-xs text-[#55665a] block">
                        {k.kategori} · {k.periode_bulan}
                      </small>
                      <strong className="text-sm text-[#1d2b21]">{k.nama_materi}</strong>
                      {k.catatan_guru && (
                        <p className="text-xs text-[#55665a] mt-0.5">{k.catatan_guru}</p>
                      )}
                    </div>
                    <span className="nilai">{k.status_progres}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {/* DISKUSI ORANG TUA */}
      {subTab === 'ulasan' && (
        <section className="kartu space-y-4">
          <h2 className="text-xl text-[#0f4527]">Diskusi laporan {periodeBulan}</h2>
          {ulasanList.length === 0 ? (
            <p className="kosong">Belum ada pesan untuk bulan ini. Tulis pesan pertama di bawah.</p>
          ) : (
            <ol className="obrolan">
              {ulasanList.map((u) => (
                <li key={u.ulasan_id} className={u.pengirim_role === 'Guru' ? 'saya' : ''}>
                  <strong className="text-xs text-[#0f4527]">{u.pengirim_nama}</strong>
                  <p className="text-sm text-[#1d2b21]">{u.isi_pesan}</p>
                  <time>{u.created_at.slice(0, 10)}</time>
                </li>
              ))}
            </ol>
          )}
          <form onSubmit={handleReplyUlasan} className="space-y-3 pt-2 border-t border-[#d9d5c0]">
            <label className="block">
              <span className="block font-extrabold text-sm mb-1">Balasan guru</span>
              <textarea
                rows={2}
                required
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Tulis balasan atau apresiasi untuk orang tua..."
                className="isian-kontrol"
              />
            </label>
            <button type="submit" className="tbl">
              Kirim
            </button>
          </form>
        </section>
      )}
    </div>
  );
};
