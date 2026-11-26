import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UlasanOrtu } from '../../types';
import { AnthropometryChart } from '../common/AnthropometryChart';
import { CetakRaporView } from '../guru/CetakRaporView';

interface OrtuPerkembanganViewProps {
  selectedSiswaId: string;
}

export const OrtuPerkembanganView: React.FC<OrtuPerkembanganViewProps> = ({ selectedSiswaId }) => {
  const { db, currentUser, updateDb } = useApp();
  const [subTab, setSubTab] = useState<'grafik' | 'rapor' | 'ulasan'>('grafik');
  const [pesan, setPesan] = useState('');

  const myChildren = useMemo(() => {
    const linked = db.siswa.filter((s) => s.ortu_user_id === currentUser?.user_id);
    return linked.length > 0 ? linked : db.siswa;
  }, [db.siswa, currentUser]);

  const student = useMemo(
    () => myChildren.find((s) => s.siswa_id === selectedSiswaId) || myChildren[0],
    [myChildren, selectedSiswaId]
  );

  const studentAntro = useMemo(() => {
    if (!student) return [];
    return db.antropometri
      .filter((a) => a.siswa_id === student.siswa_id)
      .sort((a, b) => a.periode_bulan.localeCompare(b.periode_bulan));
  }, [db.antropometri, student]);

  const studentAgama = useMemo(() => {
    if (!student) return [];
    return db.keagamaan.filter((k) => k.siswa_id === student.siswa_id);
  }, [db.keagamaan, student]);

  const handleSendUlasan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student || !pesan.trim()) return;
    const taId = db.tahunAjaran.find((t) => t.status_aktif)?.ta_id || 'TA-2026-2027';
    const row: UlasanOrtu = {
      ulasan_id: `ULS-${Date.now()}`,
      siswa_id: student.siswa_id,
      ta_id: taId,
      periode_bulan: '2026-11',
      pengirim_role: 'OrangTua',
      pengirim_nama: currentUser?.nama_lengkap || 'Orang Tua',
      isi_pesan: pesan.trim(),
      created_at: new Date().toISOString(),
    };
    await updateDb(
      (prev) => ({ ...prev, ulasanOrtu: [...prev.ulasanOrtu, row] }),
      'Tersimpan'
    );
    setPesan('');
  };

  if (!student) return null;

  const ulasanList = db.ulasanOrtu.filter((u) => u.siswa_id === student.siswa_id);

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl text-[#0f4527]">
            Laporan {student.nama_anak}
          </h1>
          <p className="text-sm text-[#55665a]">
            Pertumbuhan fisik, bacaan keagamaan, cetak rapor bulanan, dan obrolan bersama guru.
          </p>
        </div>

        <div className="tab-bar">
          <button
            type="button"
            onClick={() => setSubTab('grafik')}
            className={`tab-btn ${subTab === 'grafik' ? 'aktif' : ''}`}
          >
            Tumbuh &amp; Agama
          </button>
          <button
            type="button"
            onClick={() => setSubTab('rapor')}
            className={`tab-btn ${subTab === 'rapor' ? 'aktif' : ''}`}
          >
            Cetak rapor
          </button>
          <button
            type="button"
            onClick={() => setSubTab('ulasan')}
            className={`tab-btn ${subTab === 'ulasan' ? 'aktif' : ''}`}
          >
            Diskusi
          </button>
        </div>
      </div>

      {subTab === 'grafik' && (
        <div className="space-y-5">
          <section className="kartu space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl text-[#0f4527]">Bagaimana pertumbuhan tiap bulan?</h2>
              {studentAntro.length > 0 && (
                <span className="nilai">
                  {studentAntro[studentAntro.length - 1].status_gizi_otomatis}
                </span>
              )}
            </div>
            <AnthropometryChart records={studentAntro} studentName={student.nama_anak} />
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
                        <td className="py-2 px-2 font-mono-tabular">{a.bb_kg} kg</td>
                        <td className="py-2 px-2 font-mono-tabular">{a.tb_cm} cm</td>
                        <td className="py-2 px-2 font-mono-tabular">{a.lk_cm} cm</td>
                        <td className="py-2 px-2 font-mono-tabular">{a.lila_cm} cm</td>
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

          <section className="kartu space-y-3">
            <h2 className="text-xl text-[#0f4527]">Bacaan dan keagamaan</h2>
            {studentAgama.length === 0 ? (
              <p className="kosong">Belum ada materi keagamaan yang dinilai pada bulan ini.</p>
            ) : (
              <ul className="daftar">
                {studentAgama.map((a) => (
                  <li key={a.agama_id}>
                    <div>
                      <small className="text-xs text-[#55665a] block">{a.kategori}</small>
                      <strong className="text-sm text-[#1d2b21]">{a.nama_materi}</strong>
                      {a.catatan_guru && (
                        <p className="text-xs text-[#55665a] mt-0.5">{a.catatan_guru}</p>
                      )}
                    </div>
                    <span className="nilai">{a.status_progres}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {subTab === 'rapor' && <CetakRaporView lockedSiswaId={student.siswa_id} />}

      {subTab === 'ulasan' && (
        <section className="kartu space-y-4">
          <h2 className="text-xl text-[#0f4527]">Diskusi laporan</h2>
          {ulasanList.length === 0 ? (
            <p className="kosong">Belum ada pesan untuk bulan ini. Tulis pesan pertama di bawah.</p>
          ) : (
            <ol className="obrolan">
              {ulasanList.map((u) => (
                <li key={u.ulasan_id} className={u.pengirim_role === 'OrangTua' ? 'saya' : ''}>
                  <strong className="text-xs text-[#0f4527]">{u.pengirim_nama}</strong>
                  <p className="text-sm text-[#1d2b21]">{u.isi_pesan}</p>
                  <time>{u.created_at.slice(0, 10)}</time>
                </li>
              ))}
            </ol>
          )}
          <form onSubmit={handleSendUlasan} className="space-y-3 pt-2 border-t border-[#d9d5c0]">
            <label className="block">
              <span className="block font-extrabold text-sm mb-1">Tanggapan Anda</span>
              <textarea
                rows={2}
                required
                value={pesan}
                onChange={(e) => setPesan(e.target.value)}
                placeholder="Tulis tanggapan atau pertanyaan untuk guru kelas..."
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
