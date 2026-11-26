import React, { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Layers,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { JenjangKurikulum, MasterKelas } from '../../types';
import { getMasterKelasList, getNextClassTarget, inferJenjangFromName } from '../../utils/kelas';

export const KelolaKelasPanel: React.FC = () => {
  const { db, updateDb, addToast, triggerCelebration } = useApp();

  const kelasList = useMemo(() => getMasterKelasList(db), [db]);

  const [newName, setNewName] = useState('');
  const [newJenjang, setNewJenjang] = useState<JenjangKurikulum>('A');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingJenjang, setEditingJenjang] = useState<JenjangKurikulum>('A');

  const [deleteTarget, setDeleteTarget] = useState<MasterKelas | null>(null);
  const [migrateToClass, setMigrateToClass] = useState('');

  const handleAddKelas = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newName.trim();
    if (!clean) {
      addToast('Nama kelas wajib diisi.', 'error');
      return;
    }
    if (clean.toLowerCase() === 'lulus') {
      addToast('Nama "Lulus" dipakai sistem untuk alumni ke SD. Gunakan nama kelas lain.', 'error');
      return;
    }
    if (kelasList.some((k) => k.nama_kelas.toLowerCase() === clean.toLowerCase())) {
      addToast(`Kelas "${clean}" sudah ada.`, 'error');
      return;
    }

    const maxUrutan = kelasList.reduce((m, k) => Math.max(m, k.urutan), 0);
    const created: MasterKelas = {
      kelas_id: `KLS-${Date.now().toString().slice(-5)}`,
      nama_kelas: clean,
      jenjang: newJenjang,
      urutan: maxUrutan + 1,
      aktif: true,
    };

    await updateDb(
      (prev) => ({
        ...prev,
        masterKelas: [...getMasterKelasList(prev), created],
      }),
      `Kelas "${clean}" ditambahkan.`
    );
    triggerCelebration(`Kelas ${clean} dibuat!`);
    setNewName('');
  };

  const startEdit = (k: MasterKelas) => {
    setEditingId(k.kelas_id);
    setEditingName(k.nama_kelas);
    setEditingJenjang(k.jenjang);
  };

  const handleSaveEdit = async (target: MasterKelas) => {
    const clean = editingName.trim();
    if (!clean) {
      addToast('Nama kelas tidak boleh kosong.', 'error');
      return;
    }
    if (clean.toLowerCase() === 'lulus') {
      addToast('Nama "Lulus" dipakai sistem. Pilih nama lain.', 'error');
      return;
    }
    if (
      clean.toLowerCase() !== target.nama_kelas.toLowerCase() &&
      kelasList.some((k) => k.nama_kelas.toLowerCase() === clean.toLowerCase())
    ) {
      addToast(`Kelas "${clean}" sudah ada.`, 'error');
      return;
    }

    const oldName = target.nama_kelas;
    await updateDb(
      (prev) => {
        const currentList = getMasterKelasList(prev);
        const updatedMaster = currentList.map((k) =>
          k.kelas_id === target.kelas_id
            ? { ...k, nama_kelas: clean, jenjang: editingJenjang }
            : k
        );
        if (oldName === clean) {
          return { ...prev, masterKelas: updatedMaster };
        }
        return {
          ...prev,
          masterKelas: updatedMaster,
          siswa: prev.siswa.map((s) =>
            s.kelas_aktif === oldName ? { ...s, kelas_aktif: clean } : s
          ),
          users: prev.users.map((u) =>
            u.kelas_ampu === oldName ? { ...u, kelas_ampu: clean } : u
          ),
          riwayatKelas: prev.riwayatKelas.map((r) =>
            r.kelas === oldName ? { ...r, kelas: clean } : r
          ),
          literasi: prev.literasi.map((l) =>
            l.kelas === oldName ? { ...l, kelas: clean } : l
          ),
          logMateriHarian: prev.logMateriHarian.map((l) =>
            l.kelas === oldName ? { ...l, kelas: clean } : l
          ),
          daftarHadir: prev.daftarHadir.map((d) =>
            d.kelas === oldName ? { ...d, kelas: clean } : d
          ),
          asesmenAnekdot: prev.asesmenAnekdot.map((a) =>
            a.kelas === oldName ? { ...a, kelas: clean } : a
          ),
          asesmenHasilKarya: prev.asesmenHasilKarya.map((k) =>
            k.kelas === oldName ? { ...k, kelas: clean } : k
          ),
          asesmenCeklis: prev.asesmenCeklis.map((c) =>
            c.kelas === oldName ? { ...c, kelas: clean } : c
          ),
        };
      },
      oldName === clean
        ? `Pengaturan kelas "${clean}" diperbarui.`
        : `Kelas "${oldName}" diubah menjadi "${clean}".`
    );
    setEditingId(null);
  };

  const handleMoveOrder = async (index: number, direction: -1 | 1) => {
    const swapIdx = index + direction;
    if (swapIdx < 0 || swapIdx >= kelasList.length) return;
    const reordered = [...kelasList];
    const [picked] = reordered.splice(index, 1);
    reordered.splice(swapIdx, 0, picked);
    const normalized = reordered.map((k, idx) => ({ ...k, urutan: idx + 1 }));
    await updateDb(
      (prev) => ({
        ...prev,
        masterKelas: normalized,
      }),
      'Urutan jenjang kelas diperbarui.'
    );
  };

  const openDeleteModal = (k: MasterKelas) => {
    if (kelasList.length <= 1) {
      addToast('Minimal harus ada satu kelas aktif di sekolah.', 'error');
      return;
    }
    const fallbackTarget = kelasList.find((item) => item.kelas_id !== k.kelas_id)?.nama_kelas || '';
    setMigrateToClass(fallbackTarget);
    setDeleteTarget(k);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const oldName = deleteTarget.nama_kelas;
    const studentsInClass = db.siswa.filter(
      (s) => s.status_siswa === 'Aktif' && s.kelas_aktif === oldName
    ).length;

    if (studentsInClass > 0 && !migrateToClass) {
      addToast('Pilih kelas tujuan untuk memindahkan murid yang masih ada.', 'error');
      return;
    }

    await updateDb((prev) => {
      const remaining = getMasterKelasList(prev)
        .filter((k) => k.kelas_id !== deleteTarget.kelas_id)
        .map((k, idx) => ({ ...k, urutan: idx + 1 }));
      return {
        ...prev,
        masterKelas: remaining,
        siswa:
          studentsInClass > 0 && migrateToClass
            ? prev.siswa.map((s) =>
                s.kelas_aktif === oldName ? { ...s, kelas_aktif: migrateToClass } : s
              )
            : prev.siswa,
        users: prev.users.map((u) =>
          u.kelas_ampu === oldName ? { ...u, kelas_ampu: migrateToClass || '' } : u
        ),
      };
    }, `Kelas "${oldName}" dihapus.`);

    setDeleteTarget(null);
  };

  return (
    <section className="kartu space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-[#d9d5c0]">
        <div>
          <h2 className="text-lg text-[#0f4527] inline-flex items-center gap-2 m-0">
            <Layers className="w-4 h-4 text-[#176238]" />
            <span>Daftar kelas sekolah (custom · tambah / kurangi)</span>
          </h2>
          <p className="text-xs text-[#55665a] mt-1 m-0">
            Atur nama kelas sesuai kebutuhan lembaga (mis. KB, TK A1, TK B1, Kelas Tahfidz). Urutan dari atas ke bawah menentukan alur kenaikan kelas hingga Lulus ke SD.
          </p>
        </div>
        <span className="text-xs font-bold text-[#0f4527] px-2.5 py-1 rounded-full bg-[#dcebd2]/70">
          {kelasList.length} kelas aktif
        </span>
      </div>

      <div className="space-y-2">
        {kelasList.map((k, idx) => {
          const studentCount = db.siswa.filter(
            (s) => s.status_siswa === 'Aktif' && s.kelas_aktif === k.nama_kelas
          ).length;
          const isEditing = editingId === k.kelas_id;
          const target = getNextClassTarget(db, k.nama_kelas);
          const nextLabel = target.isFinal
            ? 'Keputusan Guru/Admin (Tinggal Kelas atau Lulus ke SD)'
            : `→ ${target.nextClassName}`;

          return (
            <div
              key={k.kelas_id}
              className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-[#d9d5c0] bg-[#fbf6e7]"
            >
              {isEditing ? (
                <div className="flex flex-wrap items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    aria-label="Nama kelas"
                    className="isian-kontrol min-h-[36px] py-1 text-xs max-w-[200px]"
                  />
                  <select
                    value={editingJenjang}
                    onChange={(e) => setEditingJenjang(e.target.value as JenjangKurikulum)}
                    aria-label="Jenjang kurikulum"
                    className="isian-kontrol min-h-[36px] py-1 text-xs w-auto"
                  >
                    <option value="A">Kurikulum Dasar (Setara Kelompok A)</option>
                    <option value="B">Kurikulum Lanjutan (Setara Kelompok B)</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => handleSaveEdit(k)}
                    className="tbl kecil"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Simpan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="tbl polos kecil"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                    <span className="text-[11px] font-mono-tabular font-bold px-2 py-0.5 rounded-md bg-[#fffdf7] border border-[#d9d5c0] text-[#55665a]">
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-[#1d2b21] m-0">{k.nama_kelas}</p>
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                            k.jenjang === 'B'
                              ? 'bg-[#e0f2fe] text-[#075985]'
                              : 'bg-[#dcebd2] text-[#0f4527]'
                          }`}
                        >
                          Kurikulum {k.jenjang === 'B' ? 'Kelompok B' : 'Kelompok A'}
                        </span>
                        <span className="text-[11px] font-mono-tabular text-[#55665a]">
                          {studentCount} murid
                        </span>
                      </div>
                      <p className="text-[11px] text-[#55665a] m-0 mt-0.5">
                        Alur naik kelas: <strong className="text-[#0f4527]">{nextLabel}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveOrder(idx, -1)}
                      aria-label={`Naikkan urutan ${k.nama_kelas}`}
                      title="Naikkan urutan jenjang"
                      className="p-1.5 rounded-lg border border-[#d9d5c0] text-[#1d2b21] hover:bg-[#dcebd2] disabled:opacity-35 cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === kelasList.length - 1}
                      onClick={() => handleMoveOrder(idx, 1)}
                      aria-label={`Turunkan urutan ${k.nama_kelas}`}
                      title="Turunkan urutan jenjang"
                      className="p-1.5 rounded-lg border border-[#d9d5c0] text-[#1d2b21] hover:bg-[#dcebd2] disabled:opacity-35 cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(k)}
                      aria-label={`Ubah nama ${k.nama_kelas}`}
                      title="Ubah nama / kurikulum kelas"
                      className="p-1.5 rounded-lg border border-[#d9d5c0] text-[#0f4527] hover:bg-[#dcebd2] cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={kelasList.length <= 1}
                      onClick={() => openDeleteModal(k)}
                      aria-label={`Hapus kelas ${k.nama_kelas}`}
                      title={
                        kelasList.length <= 1
                          ? 'Minimal 1 kelas harus tersisa'
                          : `Hapus kelas ${k.nama_kelas}`
                      }
                      className="p-1.5 rounded-lg border border-[#d9d5c0] text-[#a33a25] hover:bg-[#f8dcd6] disabled:opacity-35 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Form Tambah Kelas Baru */}
      <form onSubmit={handleAddKelas} className="pt-3 border-t border-[#d9d5c0] space-y-2.5">
        <p className="text-xs font-bold text-[#55665a] m-0">Tambah kelas custom baru</p>
        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="text"
            value={newName}
            onChange={(e) => {
              const val = e.target.value;
              setNewName(val);
              if (val.trim()) {
                setNewJenjang(inferJenjangFromName(val));
              }
            }}
            placeholder="Contoh: Kelompok Bermain / Kelas A1 / Kelas B2"
            className="isian-kontrol min-h-[38px] text-xs flex-1 min-w-[200px]"
          />
          <select
            value={newJenjang}
            onChange={(e) => setNewJenjang(e.target.value as JenjangKurikulum)}
            aria-label="Kurikulum jenjang kelas baru"
            className="isian-kontrol min-h-[38px] text-xs w-auto"
          >
            <option value="A">Kurikulum Dasar (Kelompok A)</option>
            <option value="B">Kurikulum Lanjutan (Kelompok B)</option>
          </select>
          <button type="submit" className="tbl kecil">
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah kelas</span>
          </button>
        </div>
      </form>

      {/* Modal Konfirmasi Hapus Kelas */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b1f14]/55 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="judul-hapus-kelas"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteTarget(null);
          }}
        >
          <div className="w-full max-w-md bg-[#fffdf7] rounded-[26px] border border-[#d9d5c0] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 id="judul-hapus-kelas" className="text-xl text-[#a33a25] m-0">
                Hapus kelas “{deleteTarget.nama_kelas}”?
              </h2>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                aria-label="Tutup dialog"
                className="w-9 h-9 rounded-full flex items-center justify-center text-[#55665a] hover:bg-[#dcebd2] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {(() => {
              const count = db.siswa.filter(
                (s) => s.status_siswa === 'Aktif' && s.kelas_aktif === deleteTarget.nama_kelas
              ).length;
              if (count === 0) {
                return (
                  <p className="text-sm text-[#1d2b21] m-0">
                    Tidak ada murid aktif di kelas ini. Kelas akan dihapus dari daftar dan Google Sheets.
                  </p>
                );
              }
              return (
                <div className="space-y-3">
                  <p className="text-sm text-[#1d2b21] m-0">
                    Masih ada <strong>{count} murid aktif</strong> di{' '}
                    <strong>{deleteTarget.nama_kelas}</strong>. Pilih kelas tujuan untuk memindahkan mereka sebelum kelas ini dihapus:
                  </p>
                  <select
                    value={migrateToClass}
                    onChange={(e) => setMigrateToClass(e.target.value)}
                    className="isian-kontrol text-sm"
                  >
                    {kelasList
                      .filter((k) => k.kelas_id !== deleteTarget.kelas_id)
                      .map((k) => (
                        <option key={k.kelas_id} value={k.nama_kelas}>
                          Pindahkan ke {k.nama_kelas}
                        </option>
                      ))}
                  </select>
                </div>
              );
            })()}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="tbl polos"
              >
                Batal
              </button>
              <button type="button" onClick={handleConfirmDelete} className="tbl merah">
                Ya, hapus kelas
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
