import React, { useMemo, useState } from 'react';
import { Plus, Check, Trash2, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BankMateriHarian, LogMateriHarian, StatusPenguasaanHarian } from '../../types';
import { isWeekdaySeninJumat } from '../../utils/kaih';
import { GuruSpiritBanner } from '../common/StickerCelebration';

const STATUS_PENGUASAAN_OPTIONS: StatusPenguasaanHarian[] = [
  'Belum Mengenal',
  'Mulai Mengenal',
  'Perlu Latihan',
  'Lancar',
];

function getDefaultWeekdayDate(): string {
  const now = new Date();
  const day = now.getDay();
  if (day === 6) now.setDate(now.getDate() - 1);
  else if (day === 0) now.setDate(now.getDate() - 2);
  return now.toISOString().slice(0, 10);
}

function getWeekdayLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  return new Date(y, m - 1, d).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export const InputMateriHarianView: React.FC = () => {
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

  const [selectedSiswaId, setSelectedSiswaId] = useState<string>(
    () => availableStudents[0]?.siswa_id || ''
  );
  const [tanggal, setTanggal] = useState<string>(getDefaultWeekdayDate);
  const [showAllLevels, setShowAllLevels] = useState<boolean>(false);
  const [bidang, setBidang] = useState<'Literasi' | 'Hijaiyah_Iqra'>('Literasi');
  const [kategori, setKategori] = useState<
    'Huruf' | 'Suku Kata' | 'Kata' | 'Kalimat' | 'Paragraf' | 'Hijaiyah' | 'Iqra'
  >('Huruf');
  const [selectedGroupCode, setSelectedGroupCode] = useState<string>('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [halamanIqra, setHalamanIqra] = useState<string>('');
  const [statusPenguasaan, setStatusPenguasaan] = useState<StatusPenguasaanHarian>('Mulai Mengenal');
  const [catatanGuru, setCatatanGuru] = useState<string>('');

  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newLabelKelompok, setNewLabelKelompok] = useState('');
  const [newLevelTrack, setNewLevelTrack] = useState('Kelas A / Track 1');
  const [newIsiItem, setNewIsiItem] = useState('');
  const [newPertanyaanCek, setNewPertanyaanCek] = useState('');

  const selectedStudent = useMemo(
    () => availableStudents.find((s) => s.siswa_id === selectedSiswaId) || availableStudents[0],
    [availableStudents, selectedSiswaId]
  );

  const kategoriTabs = useMemo(() => {
    if (bidang === 'Literasi') {
      return ['Huruf', 'Suku Kata', 'Kata', 'Kalimat', 'Paragraf'] as const;
    }
    return ['Hijaiyah', 'Iqra'] as const;
  }, [bidang]);

  const handleSwitchBidang = (nextBidang: 'Literasi' | 'Hijaiyah_Iqra') => {
    setBidang(nextBidang);
    setKategori(nextBidang === 'Literasi' ? 'Huruf' : 'Hijaiyah');
    setSelectedGroupCode('');
    setSelectedItems([]);
  };

  const handleSwitchKategori = (
    nextKat: 'Huruf' | 'Suku Kata' | 'Kata' | 'Kalimat' | 'Paragraf' | 'Hijaiyah' | 'Iqra'
  ) => {
    setKategori(nextKat);
    setSelectedGroupCode('');
    setSelectedItems([]);
  };

  const filteredGroups = useMemo(() => {
    const base = db.bankMateriHarian.filter(
      (b) => b.aktif && b.bidang === bidang && b.kategori === kategori
    );
    if (showAllLevels || !selectedStudent || bidang === 'Hijaiyah_Iqra') {
      return base;
    }
    if (selectedStudent.kelas_aktif === 'Kelas A') {
      const matched = base.filter((b) => b.level_track.includes('Kelas A'));
      return matched.length > 0 ? matched : base;
    }
    const trackMap: Record<string, string> = {
      TRACK_1: 'Track 1',
      TRACK_2: 'Track 2',
      TRACK_3: 'Track 3',
      TRACK_4: 'Track 4',
    };
    const needle = trackMap[selectedStudent.target_literasi_kelas_b];
    if (!needle) return base;
    const matched = base.filter((b) => b.level_track.includes(needle));
    return matched.length > 0 ? matched : base;
  }, [db.bankMateriHarian, bidang, kategori, showAllLevels, selectedStudent]);

  const activeGroup = useMemo(() => {
    return (
      filteredGroups.find((g) => g.kode_item === selectedGroupCode) || filteredGroups[0] || null
    );
  }, [filteredGroups, selectedGroupCode]);

  const groupItems = useMemo(() => {
    if (!activeGroup) return [];
    return activeGroup.isi_item
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean);
  }, [activeGroup]);

  const toggleItem = (item: string) => {
    setSelectedItems((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  };

  const handleSelectAllInGroup = () => {
    const allSelected = groupItems.length > 0 && groupItems.every((it) => selectedItems.includes(it));
    if (allSelected) {
      setSelectedItems((prev) => prev.filter((x) => !groupItems.includes(x)));
    } else {
      setSelectedItems((prev) => Array.from(new Set([...prev, ...groupItems])));
    }
  };

  const handleSaveLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !activeGroup) return;
    if (selectedItems.length === 0) {
      addToast('Pilih minimal 1 item huruf, kata, atau bacaan terlebih dahulu.', 'error');
      return;
    }

    const activeTa = db.tahunAjaran.find((t) => t.status_aktif)?.ta_id || 'TA-2026-2027';
    const newLog: LogMateriHarian = {
      id_log: `LOG-${Date.now()}`,
      tanggal,
      id_siswa: selectedStudent.siswa_id,
      nama_siswa: selectedStudent.nama_anak,
      kelas: selectedStudent.kelas_aktif === 'Kelas B' ? 'Kelas B' : 'Kelas A',
      ta_id: activeTa,
      bidang,
      kategori,
      kode_item: activeGroup.kode_item,
      item_dipilih: selectedItems.join(', '),
      halaman_iqra: kategori === 'Iqra' ? halamanIqra.trim() : '',
      status_penguasaan: statusPenguasaan,
      catatan_guru: catatanGuru.trim(),
      nama_guru: currentUser?.nama_lengkap || 'Guru Kelas',
      timestamp: new Date().toISOString(),
    };

    await updateDb(
      (prev) => ({
        ...prev,
        logMateriHarian: [newLog, ...prev.logMateriHarian],
      }),
      'Tersimpan'
    );
    triggerCelebration(`Catatan ${selectedStudent.nama_anak} tersimpan!`);

    setSelectedItems([]);
    setCatatanGuru('');
    if (kategori === 'Iqra') setHalamanIqra('');
  };

  const handleAddCustomMateri = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabelKelompok.trim() || !newIsiItem.trim()) {
      addToast('Isi nama kelompok dan daftar item materi.', 'error');
      return;
    }
    const newRow: BankMateriHarian = {
      kode_item: `CST-${Date.now().toString().slice(-5)}`,
      bidang,
      level_track: newLevelTrack,
      kategori,
      label_kelompok: newLabelKelompok.trim(),
      isi_item: newIsiItem
        .split('\n')
        .join('|')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .join('|'),
      pertanyaan_cek: kategori === 'Paragraf' ? newPertanyaanCek.trim() : '',
      aktif: true,
    };

    await updateDb(
      (prev) => ({
        ...prev,
        bankMateriHarian: [...prev.bankMateriHarian, newRow],
      }),
      'Materi baru ditambahkan'
    );
    setSelectedGroupCode(newRow.kode_item);
    setNewLabelKelompok('');
    setNewIsiItem('');
    setNewPertanyaanCek('');
    setShowAddModal(false);
  };

  const handleDeleteLog = async (idLog: string) => {
    await updateDb(
      (prev) => ({
        ...prev,
        logMateriHarian: prev.logMateriHarian.filter((l) => l.id_log !== idLog),
      }),
      'Catatan dihapus'
    );
  };

  const isWeekday = isWeekdaySeninJumat(tanggal);
  const studentLogs = useMemo(() => {
    if (!selectedStudent) return [];
    return db.logMateriHarian
      .filter((l) => l.id_siswa === selectedStudent.siswa_id)
      .sort((a, b) => b.tanggal.localeCompare(a.tanggal))
      .slice(0, 12);
  }, [db.logMateriHarian, selectedStudent]);

  const loggedStudentsTodayCount = useMemo(() => {
    const ids = new Set(
      db.logMateriHarian.filter((l) => l.tanggal === tanggal).map((l) => l.id_siswa)
    );
    return availableStudents.filter((s) => ids.has(s.siswa_id)).length;
  }, [db.logMateriHarian, availableStudents, tanggal]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl text-[#0f4527]">Materi harian (Senin–Jumat)</h1>
          <p className="text-sm text-[#55665a]">
            Catat huruf, kata, atau bacaan Iqra yang dipelajari anak hari ini.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="tbl polos kecil"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah materi baru</span>
        </button>
      </div>

      <GuruSpiritBanner
        done={loggedStudentsTodayCount}
        total={availableStudents.length}
        titleProgress={`${loggedStudentsTodayCount} dari ${availableStudents.length} anak sudah punya catatan belajar tanggal ${tanggal}`}
        titleDone={`Alhamdulillah! Semua ${availableStudents.length} anak sudah dicatat belajar tanggal ${tanggal}`}
      />

      {/* Formulir Input */}
      <form onSubmit={handleSaveLog} className="kartu space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <label className="block">
            <span className="block font-extrabold text-xs mb-1">Anak</span>
            <select
              id="select-siswa-harian"
              value={selectedStudent?.siswa_id || ''}
              onChange={(e) => {
                setSelectedSiswaId(e.target.value);
                setSelectedItems([]);
              }}
              className="isian-kontrol"
            >
              {availableStudents.map((s) => (
                <option key={s.siswa_id} value={s.siswa_id}>
                  {s.nama_anak} ({s.kelas_aktif}
                  {s.kelas_aktif === 'Kelas B' ? ` · ${s.target_literasi_kelas_b}` : ''})
                </option>
              ))}
            </select>
          </label>

          <div>
            <label className="block">
              <span className="block font-extrabold text-xs mb-1">Tanggal belajar</span>
              <input
                id="input-tanggal-harian"
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="isian-kontrol font-mono-tabular"
              />
            </label>
            <p className={`mt-1 text-xs ${isWeekday ? 'text-[#55665a]' : 'text-[#a33a25] font-semibold'}`}>
              {getWeekdayLabel(tanggal)}
              {!isWeekday && ' (Akhir pekan)'}
            </p>
          </div>

          <div className="pb-1">
            <button
              type="button"
              onClick={() => setShowAllLevels((v) => !v)}
              aria-pressed={showAllLevels}
              className={`w-full min-h-[44px] px-4 rounded-[14px] border-2 text-xs font-bold flex items-center justify-between cursor-pointer ${
                showAllLevels
                  ? 'bg-[#dcebd2] border-[#176238] text-[#0f4527]'
                  : 'bg-white border-[#d9d5c0] text-[#55665a]'
              }`}
            >
              <span>Tampilkan semua level</span>
              <span>{showAllLevels ? 'Semua' : 'Sesuai anak'}</span>
            </button>
          </div>
        </div>

        {/* Bidang & Kategori */}
        <div className="space-y-3 pt-3 border-t border-[#d9d5c0]">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleSwitchBidang('Literasi')}
              className={`tbl kecil ${bidang === 'Literasi' ? '' : 'polos'}`}
            >
              Literasi
            </button>
            <button
              type="button"
              onClick={() => handleSwitchBidang('Hijaiyah_Iqra')}
              className={`tbl kecil ${bidang === 'Hijaiyah_Iqra' ? '' : 'polos'}`}
            >
              Hijaiyah &amp; Iqra
            </button>
          </div>

          <div className="tab-bar">
            {kategoriTabs.map((kat) => (
              <button
                key={kat}
                type="button"
                onClick={() => handleSwitchKategori(kat)}
                className={`tab-btn ${kategori === kat ? 'aktif' : ''}`}
              >
                {kat}
              </button>
            ))}
          </div>
        </div>

        {filteredGroups.length > 0 && (
          <div className="space-y-4">
            <label className="block">
              <span className="block font-extrabold text-xs mb-1">
                Kelompok materi ({filteredGroups.length} tersedia)
              </span>
              <select
                id="select-kelompok-materi"
                value={activeGroup?.kode_item || ''}
                onChange={(e) => {
                  setSelectedGroupCode(e.target.value);
                  setSelectedItems([]);
                }}
                className="isian-kontrol"
              >
                {filteredGroups.map((g) => (
                  <option key={g.kode_item} value={g.kode_item}>
                    [{g.level_track}] {g.label_kelompok}
                  </option>
                ))}
              </select>
            </label>

            {activeGroup && (
              <div className="rounded-[18px] border border-[#d9d5c0] bg-[#fbf6e7]/65 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs text-[#55665a]">
                    <strong className="text-[#0f4527]">{activeGroup.label_kelompok}</strong>
                    <span className="mx-1.5">·</span>
                    <span>{activeGroup.level_track}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSelectAllInGroup}
                    className="tbl polos kecil"
                  >
                    Pilih semua
                  </button>
                </div>

                <div
                  dir={bidang === 'Hijaiyah_Iqra' ? 'rtl' : 'ltr'}
                  className="flex flex-wrap gap-2"
                >
                  {groupItems.map((item) => {
                    const isChecked = selectedItems.includes(item);
                    const isArabic = bidang === 'Hijaiyah_Iqra';
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleItem(item)}
                        aria-pressed={isChecked}
                        className={`min-h-[44px] px-3.5 py-2 rounded-[14px] border-2 text-left transition-colors flex items-center gap-2 cursor-pointer ${
                          isChecked
                            ? 'bg-[#176238] border-[#176238] text-white font-bold cap-pop'
                            : 'bg-white border-[#d9d5c0] text-[#1d2b21] hover:border-[#176238]'
                        } ${isArabic ? 'font-arabic text-xl leading-relaxed' : 'text-sm'}`}
                      >
                        {isChecked && <Check className="w-4 h-4 shrink-0" />}
                        <span>{item}</span>
                      </button>
                    );
                  })}
                </div>

                {kategori === 'Paragraf' && activeGroup.pertanyaan_cek && (
                  <div className="mt-2 p-3.5 rounded-[14px] bg-[#fdeab5]/60 border border-[#f2b632] text-xs text-[#1d2b21]">
                    <p className="font-bold">Pertanyaan cek pemahaman:</p>
                    <p className="mt-1 text-sm">{activeGroup.pertanyaan_cek}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Status Penguasaan + Catatan */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3 border-t border-[#d9d5c0]">
          <div className="space-y-4">
            {kategori === 'Iqra' && (
              <label className="block">
                <span className="block font-extrabold text-xs mb-1">Nomor halaman Iqra</span>
                <input
                  id="input-hal-iqra"
                  type="text"
                  value={halamanIqra}
                  onChange={(e) => setHalamanIqra(e.target.value)}
                  placeholder="Contoh: Hal. 14"
                  className="isian-kontrol"
                />
              </label>
            )}

            <div>
              <span className="block font-extrabold text-xs mb-2">
                Penguasaan hari ini
              </span>
              <div className="grid grid-cols-2 gap-2">
                {STATUS_PENGUASAAN_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setStatusPenguasaan(opt)}
                    aria-pressed={statusPenguasaan === opt}
                    className={`min-h-[44px] px-3 py-2 rounded-[14px] border-2 text-xs font-bold text-left transition-colors cursor-pointer ${
                      statusPenguasaan === opt
                        ? 'bg-[#176238] border-[#176238] text-white cap-pop'
                        : 'bg-white border-[#d9d5c0] text-[#1d2b21] hover:border-[#176238]'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-4">
            <label className="block">
              <span className="block font-extrabold text-xs mb-1">Catatan guru</span>
              <textarea
                id="input-catatan-harian"
                rows={3}
                value={catatanGuru}
                onChange={(e) => setCatatanGuru(e.target.value)}
                placeholder="Contoh: Ananda lancar membaca pola ba-bi-bu, ulangi bunyi be di rumah."
                className="isian-kontrol"
              />
            </label>

            <button type="submit" className="tbl">
              Simpan ({selectedItems.length} item dipilih)
            </button>
          </div>
        </div>
      </form>

      {/* Riwayat Harian */}
      <section className="kartu space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl text-[#0f4527]">Riwayat harian, {selectedStudent?.nama_anak}</h2>
          <span className="text-xs text-[#55665a] font-mono-tabular">
            {studentLogs.length} catatan terbaru
          </span>
        </div>

        {studentLogs.length === 0 ? (
          <p className="kosong">Belum ada catatan harian untuk anak ini.</p>
        ) : (
          <ul className="daftar">
            {studentLogs.map((log) => (
              <li key={log.id_log}>
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#55665a]">
                    <span className="font-mono-tabular font-bold text-[#1d2b21]">{log.tanggal}</span>
                    <span>·</span>
                    <span>{log.bidang === 'Literasi' ? 'Literasi' : 'Hijaiyah & Iqra'}</span>
                    <span>·</span>
                    <span>
                      {log.kategori}
                      {log.halaman_iqra ? ` (${log.halaman_iqra})` : ''}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-[#1d2b21]">{log.item_dipilih}</p>
                  {log.catatan_guru && (
                    <p className="text-xs text-[#55665a]">{log.catatan_guru}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="nilai">{log.status_penguasaan}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteLog(log.id_log)}
                    aria-label={`Hapus log ${log.tanggal} ${log.kategori}`}
                    className="p-2 rounded-full text-[#a33a25] hover:bg-[#f8dcd6] cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Modal Tambah Materi Baru */}
      {showAddModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-add-materi-title"
          className="fixed inset-0 z-50 bg-[#0f2c1c]/60 backdrop-blur-[2px] flex items-center justify-center p-4"
        >
          <div className="bg-[#fffdf7] rounded-[26px] border border-[#d9d5c0] max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 id="modal-add-materi-title" className="text-xl text-[#0f4527]">
                Tambah materi baru
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                aria-label="Tutup"
                className="p-1.5 rounded-full text-[#55665a] hover:bg-[#dcebd2] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddCustomMateri} className="space-y-3.5">
              <div className="text-xs text-[#55665a]">
                Bidang: <strong className="text-[#1d2b21]">{bidang}</strong> · Kategori:{' '}
                <strong className="text-[#1d2b21]">{kategori}</strong>
              </div>
              <label className="block">
                <span className="block font-extrabold text-xs mb-1">Level / Track</span>
                <select
                  value={newLevelTrack}
                  onChange={(e) => setNewLevelTrack(e.target.value)}
                  className="isian-kontrol"
                >
                  <option>Kelas A / Track 1</option>
                  <option>Kelas B / Track 2</option>
                  <option>Kelas B / Track 3</option>
                  <option>Kelas B / Track 4 (Next Level)</option>
                  <option>Pra-Iqra</option>
                  <option>Iqra 1</option>
                  <option>Iqra 2</option>
                  <option>Iqra 3</option>
                  <option>Iqra 4</option>
                  <option>Iqra 5</option>
                  <option>Iqra 6</option>
                </select>
              </label>
              <label className="block">
                <span className="block font-extrabold text-xs mb-1">Nama kelompok materi</span>
                <input
                  type="text"
                  required
                  value={newLabelKelompok}
                  onChange={(e) => setNewLabelKelompok(e.target.value)}
                  placeholder="Contoh: Kata tema buah-buahan"
                  className="isian-kontrol"
                />
              </label>
              <label className="block">
                <span className="block font-extrabold text-xs mb-1">
                  Daftar item (pisahkan dengan koma atau baris baru)
                </span>
                <textarea
                  rows={3}
                  required
                  value={newIsiItem}
                  onChange={(e) => setNewIsiItem(e.target.value)}
                  placeholder="man-ga, je-ruk, pi-sang, me-lon"
                  className="isian-kontrol"
                />
              </label>
              {kategori === 'Paragraf' && (
                <label className="block">
                  <span className="block font-extrabold text-xs mb-1">Pertanyaan pemahaman</span>
                  <input
                    type="text"
                    value={newPertanyaanCek}
                    onChange={(e) => setNewPertanyaanCek(e.target.value)}
                    placeholder="Contoh: Siapa tokoh dalam cerita?"
                    className="isian-kontrol"
                  />
                </label>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="tbl polos"
                >
                  Batal
                </button>
                <button type="submit" className="tbl">
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
