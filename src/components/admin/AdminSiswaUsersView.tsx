import React, { useMemo, useState } from 'react';
import {
  Eye,
  EyeOff,
  UserPlus,
  GraduationCap,
  Trash2,
  AlertTriangle,
  X,
  UploadCloud,
  FileSpreadsheet,
  Download,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  JenisKelamin,
  KelasType,
  Siswa,
  StatusSiswa,
  TrackKelasB,
  User,
} from '../../types';
import { getMasterKelasList, isKelasLanjutan } from '../../utils/kelas';
import { exportSiswaDapodikExcel } from '../../utils/dapodikImport';
import { DapodikImportModal } from './DapodikImportModal';

export const AdminSiswaUsersView: React.FC = () => {
  const {
    db,
    currentUser,
    updateDb,
    createUserByAdmin,
    deleteUserByAdmin,
    deleteSiswaWithCleanup,
    syncStatus,
    pushToSheets,
    addToast,
  } = useApp();
  const [subTab, setSubTab] = useState<'siswa' | 'users'>('siswa');

  const kelasList = useMemo(() => getMasterKelasList(db), [db]);

  // Form Siswa Baru
  const [nis, setNis] = useState('');
  const [namaAnak, setNamaAnak] = useState('');
  const [jk, setJk] = useState<JenisKelamin>('L');
  const [tglLahir, setTglLahir] = useState('2021-05-10');
  const [kelasAktif, setKelasAktif] = useState<KelasType>(() => kelasList[0]?.nama_kelas || 'Kelas A');
  const [ortuUserId, setOrtuUserId] = useState('');
  const [trackB, setTrackB] = useState<TrackKelasB>('TRACK_1');

  // Form Akun Baru (khusus Guru & Orang Tua, dibuat oleh Admin)
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'OrangTua' | 'Guru'>('OrangTua');
  const [namaLengkap, setNamaLengkap] = useState('');
  const [noHp, setNoHp] = useState('');
  const [kelasAmpu, setKelasAmpu] = useState<KelasType | ''>('');
  const [creatingUser, setCreatingUser] = useState(false);

  const [confirmDeleteSiswa, setConfirmDeleteSiswa] = useState<Siswa | null>(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<User | null>(null);
  const [deletingAction, setDeletingAction] = useState(false);
  const [showDapodikModal, setShowDapodikModal] = useState(false);

  const parentUsers = useMemo(() => db.users.filter((u) => u.role === 'OrangTua'), [db.users]);

  const activeTa = useMemo(
    () => db.tahunAjaran.find((t) => t.status_aktif) || db.tahunAjaran[0],
    [db.tahunAjaran]
  );

  const handleAddSiswa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nis.trim() || !namaAnak.trim()) {
      addToast('NIS dan nama anak wajib diisi.', 'error');
      return;
    }
    const newId = `SIS-${Date.now().toString().slice(-5)}`;
    const newSiswa: Siswa = {
      siswa_id: newId,
      nis: nis.trim(),
      nama_anak: namaAnak.trim(),
      jenis_kelamin: jk,
      tanggal_lahir: tglLahir,
      ortu_user_id: ortuUserId,
      kelas_aktif: kelasAktif,
      status_siswa: 'Aktif',
      target_literasi_kelas_b: trackB,
    };

    const wali = db.users.find((u) => u.role === 'Guru' && u.kelas_ampu === kelasAktif);

    await updateDb(
      (prev) => ({
        ...prev,
        siswa: [...prev.siswa, newSiswa],
        riwayatKelas: activeTa
          ? [
              ...prev.riwayatKelas,
              {
                riwayat_id: `RWY-${Date.now()}`,
                siswa_id: newId,
                ta_id: activeTa.ta_id,
                nama_ta: activeTa.nama_ta,
                kelas: kelasAktif,
                wali_kelas_id: wali?.user_id || '',
                status_akhir: 'Berjalan',
              },
            ]
          : prev.riwayatKelas,
      }),
      `Data ${newSiswa.nama_anak} ditambahkan.`
    );
    setNis('');
    setNamaAnak('');
  };

  const handleUpdateSiswaOrtu = async (siswaId: string, newOrtuId: string) => {
    await updateDb(
      (prev) => ({
        ...prev,
        siswa: prev.siswa.map((s) =>
          s.siswa_id === siswaId ? { ...s, ortu_user_id: newOrtuId } : s
        ),
      }),
      'Akun orang tua diperbarui.'
    );
  };

  const handleUpdateSiswaKelas = async (siswaId: string, nextKelas: string) => {
    await updateDb(
      (prev) => ({
        ...prev,
        siswa: prev.siswa.map((s) =>
          s.siswa_id === siswaId
            ? {
                ...s,
                kelas_aktif: nextKelas,
                status_siswa: nextKelas === 'Lulus' ? 'Lulus' : 'Aktif',
              }
            : s
        ),
      }),
      `Kelas siswa diubah ke ${nextKelas}.`
    );
  };

  const handleUpdateSiswaStatus = async (siswaId: string, status: StatusSiswa) => {
    await updateDb(
      (prev) => ({
        ...prev,
        siswa: prev.siswa.map((s) =>
          s.siswa_id === siswaId ? { ...s, status_siswa: status } : s
        ),
      }),
      'Status siswa diperbarui.'
    );
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim().toLowerCase();
    if (!cleanUser || !password || !namaLengkap.trim()) {
      addToast('Username, password, dan nama lengkap wajib diisi.', 'error');
      return;
    }
    if (!/^[a-z0-9._-]{3,32}$/.test(cleanUser)) {
      addToast('Username 3–32 karakter (huruf kecil, angka, titik, garis bawah, atau strip).', 'error');
      return;
    }
    if (password.length < 6) {
      addToast('Password minimal 6 karakter.', 'error');
      return;
    }
    if (db.users.some((u) => u.username.toLowerCase() === cleanUser)) {
      addToast('Username sudah dipakai akun lain.', 'error');
      return;
    }

    setCreatingUser(true);
    const res = await createUserByAdmin({
      username: cleanUser,
      password,
      nama_lengkap: namaLengkap.trim(),
      role,
      no_hp: noHp.trim(),
      kelas_ampu: role === 'Guru' ? kelasAmpu || kelasList[0]?.nama_kelas || 'Kelas A' : undefined,
    });
    setCreatingUser(false);
    if (res.ok) {
      setUsername('');
      setPassword('');
      setNamaLengkap('');
      setNoHp('');
    }
  };

  const handleToggleUserActive = async (userId: string) => {
    await updateDb(
      (prev) => ({
        ...prev,
        users: prev.users.map((u) =>
          u.user_id === userId ? { ...u, status_aktif: !u.status_aktif } : u
        ),
      }),
      'Status akun diperbarui.'
    );
  };

  const handleConfirmDeleteSiswa = async () => {
    if (!confirmDeleteSiswa) return;
    setDeletingAction(true);
    await deleteSiswaWithCleanup(confirmDeleteSiswa.siswa_id);
    setDeletingAction(false);
    setConfirmDeleteSiswa(null);
  };

  const handleConfirmDeleteUser = async () => {
    if (!confirmDeleteUser) return;
    setDeletingAction(true);
    const res = await deleteUserByAdmin(confirmDeleteUser.user_id);
    setDeletingAction(false);
    if (res.ok) {
      setConfirmDeleteUser(null);
    }
  };

  return (
    <div className="halaman">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl text-[#0f4527]">Data siswa & akun</h1>
          <p className="text-sm text-[#55665a] mt-1">
            Kelola data anak, hapus akun atau murid secara aman, dan hubungkan akun orang tua.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {Boolean(db.pengaturanSekolah.gas_webapp_url) && (
            <button
              type="button"
              onClick={pushToSheets}
              className="tbl polos kecil"
              title={
                syncStatus.connected
                  ? 'Perubahan otomatis tersinkron ke Google Sheets. Klik untuk kirim ulang manual.'
                  : 'Kirim data terbaru ke Google Sheets'
              }
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>{syncStatus.connected ? 'Sinkron ke Sheet' : 'Kirim ke Sheet'}</span>
            </button>
          )}
          <div className="tab-bar" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={subTab === 'siswa'}
              onClick={() => setSubTab('siswa')}
              className={`tab-btn ${subTab === 'siswa' ? 'aktif' : ''}`}
            >
              Data siswa ({db.siswa.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={subTab === 'users'}
              onClick={() => setSubTab('users')}
              className={`tab-btn ${subTab === 'users' ? 'aktif' : ''}`}
            >
              Akun pengguna ({db.users.length})
            </button>
          </div>
        </div>
      </div>

      {subTab === 'siswa' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Form Tambah Siswa */}
          <form onSubmit={handleAddSiswa} className="lg:col-span-4 kartu space-y-3.5">
            <div className="judul-baris">
              <h2 className="text-lg text-[#0f4527] inline-flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-[#176238]" />
                <span>Tambah siswa</span>
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="s-nis" className="block text-xs font-bold text-[#55665a] mb-1">
                  NIS
                </label>
                <input
                  id="s-nis"
                  type="text"
                  required
                  value={nis}
                  onChange={(e) => setNis(e.target.value)}
                  placeholder="2026011"
                  className="isian-kontrol min-h-[40px] text-xs font-mono-tabular"
                />
              </div>
              <div>
                <label htmlFor="s-jk" className="block text-xs font-bold text-[#55665a] mb-1">
                  Jenis kelamin
                </label>
                <select
                  id="s-jk"
                  value={jk}
                  onChange={(e) => setJk(e.target.value as JenisKelamin)}
                  className="isian-kontrol min-h-[40px] text-xs"
                >
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="s-nama" className="block text-xs font-bold text-[#55665a] mb-1">
                Nama lengkap anak
              </label>
              <input
                id="s-nama"
                type="text"
                required
                value={namaAnak}
                onChange={(e) => setNamaAnak(e.target.value)}
                placeholder="Contoh: Aisyah Humaira"
                className="isian-kontrol min-h-[40px] text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="s-tgl" className="block text-xs font-bold text-[#55665a] mb-1">
                  Tanggal lahir
                </label>
                <input
                  id="s-tgl"
                  type="date"
                  value={tglLahir}
                  onChange={(e) => setTglLahir(e.target.value)}
                  className="isian-kontrol min-h-[40px] text-xs"
                />
              </div>
              <div>
                <label htmlFor="s-kelas" className="block text-xs font-bold text-[#55665a] mb-1">
                  Kelas
                </label>
                <select
                  id="s-kelas"
                  value={kelasAktif}
                  onChange={(e) => setKelasAktif(e.target.value)}
                  className="isian-kontrol min-h-[40px] text-xs"
                >
                  {kelasList.map((k) => (
                    <option key={k.kelas_id} value={k.nama_kelas}>
                      {k.nama_kelas}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="s-ortu" className="block text-xs font-bold text-[#55665a] mb-1">
                Akun orang tua
              </label>
              <select
                id="s-ortu"
                value={ortuUserId}
                onChange={(e) => setOrtuUserId(e.target.value)}
                className="isian-kontrol min-h-[40px] text-xs"
              >
                <option value="">Belum dihubungkan</option>
                {parentUsers.map((u) => (
                  <option key={u.user_id} value={u.user_id}>
                    {u.nama_lengkap} (@{u.username})
                  </option>
                ))}
              </select>
            </div>

            {isKelasLanjutan(db, kelasAktif) && (
              <div>
                <label htmlFor="s-track" className="block text-xs font-bold text-[#55665a] mb-1">
                  Track awal ({kelasAktif})
                </label>
                <select
                  id="s-track"
                  value={trackB}
                  onChange={(e) => setTrackB(e.target.value as TrackKelasB)}
                  className="isian-kontrol min-h-[40px] text-xs"
                >
                  <option value="TRACK_1">TRACK 1 — Penguatan Dasar</option>
                  <option value="TRACK_2">TRACK 2 — Reguler</option>
                  <option value="TRACK_3">TRACK 3 — Lanjutan</option>
                  <option value="TRACK_4">TRACK 4 — Next Level</option>
                  <option value="KUSTOM">KUSTOM</option>
                </select>
              </div>
            )}

            <button type="submit" className="tbl w-full">
              Simpan siswa
            </button>
          </form>

          {/* Tabel Siswa */}
          <section className="lg:col-span-8 kartu">
            <div className="judul-baris flex-wrap gap-2">
              <div>
                <h2 className="text-lg text-[#0f4527]">Daftar siswa</h2>
                <span className="text-xs text-[#55665a]">{db.siswa.length} anak</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    exportSiswaDapodikExcel({
                      siswaList: db.siswa,
                      sekolah: db.pengaturanSekolah,
                    })
                  }
                  disabled={db.siswa.length === 0}
                  className="tbl polos kecil"
                  title="Unduh seluruh data siswa dalam format Excel Dapodik"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Excel</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowDapodikModal(true)}
                  className="tbl kecil"
                  title="Import data murid dari file Excel Dapodik dengan deteksi data ganda"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Import Excel Dapodik</span>
                </button>
              </div>
            </div>

            {db.siswa.length === 0 ? (
              <p className="kosong">Belum ada data siswa.</p>
            ) : (
              <div className="geser">
                <table className="tabel-bersih">
                  <thead>
                    <tr>
                      <th>Nama & NIS</th>
                      <th>Kelas</th>
                      <th>Orang tua</th>
                      <th>Status</th>
                      <th className="text-right"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {db.siswa.map((s) => (
                      <tr key={s.siswa_id}>
                        <td>
                          <p className="font-bold text-[#1d2b21]">{s.nama_anak}</p>
                          <p className="text-xs text-[#55665a] font-mono-tabular">
                            NIS {s.nis} · {s.jenis_kelamin} · {s.tanggal_lahir}
                          </p>
                        </td>
                        <td className="font-semibold whitespace-nowrap">
                          {s.kelas_aktif === 'Lulus' ? (
                            <span className="text-xs font-bold text-[#0f4527]">Lulus (SD)</span>
                          ) : (
                            <select
                              aria-label={`Kelas ${s.nama_anak}`}
                              value={s.kelas_aktif}
                              onChange={(e) => handleUpdateSiswaKelas(s.siswa_id, e.target.value)}
                              className="isian-kontrol min-h-[36px] py-1 text-xs w-auto max-w-[160px]"
                            >
                              {!kelasList.some((k) => k.nama_kelas === s.kelas_aktif) && (
                                <option value={s.kelas_aktif}>{s.kelas_aktif}</option>
                              )}
                              {kelasList.map((k) => (
                                <option key={k.kelas_id} value={k.nama_kelas}>
                                  {k.nama_kelas}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td>
                          <select
                            aria-label={`Akun orang tua untuk ${s.nama_anak}`}
                            value={s.ortu_user_id}
                            onChange={(e) => handleUpdateSiswaOrtu(s.siswa_id, e.target.value)}
                            className="isian-kontrol min-h-[36px] py-1 text-xs max-w-[190px]"
                          >
                            <option value="">Belum dihubungkan</option>
                            {parentUsers.map((u) => (
                              <option key={u.user_id} value={u.user_id}>
                                {u.nama_lengkap}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select
                            aria-label={`Status ${s.nama_anak}`}
                            value={s.status_siswa}
                            onChange={(e) =>
                              handleUpdateSiswaStatus(s.siswa_id, e.target.value as StatusSiswa)
                            }
                            className="isian-kontrol min-h-[36px] py-1 text-xs w-auto"
                          >
                            <option value="Aktif">Aktif</option>
                            <option value="Lulus">Lulus</option>
                            <option value="Pindah">Pindah</option>
                          </select>
                        </td>
                        <td className="text-right">
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteSiswa(s)}
                            aria-label={`Hapus murid ${s.nama_anak}`}
                            className="p-2 rounded-lg text-[#55665a] hover:text-[#a33a25] hover:bg-[#f8dcd6]/60 cursor-pointer"
                            title={`Hapus murid ${s.nama_anak}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Form Akun Baru */}
          <form onSubmit={handleAddUser} className="lg:col-span-4 kartu space-y-3.5">
            <div className="judul-baris">
              <h2 className="text-lg text-[#0f4527] inline-flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#176238]" />
                <span>Tambah akun</span>
              </h2>
            </div>

            <div>
              <label htmlFor="u-role" className="block text-xs font-bold text-[#55665a] mb-1">
                Peran
              </label>
              <select
                id="u-role"
                value={role}
                onChange={(e) => setRole(e.target.value as 'OrangTua' | 'Guru')}
                className="isian-kontrol min-h-[40px] text-xs"
              >
                <option value="OrangTua">Orang Tua</option>
                <option value="Guru">Guru</option>
              </select>
            </div>

            <div>
              <label htmlFor="u-nama" className="block text-xs font-bold text-[#55665a] mb-1">
                Nama lengkap
              </label>
              <input
                id="u-nama"
                type="text"
                required
                value={namaLengkap}
                onChange={(e) => setNamaLengkap(e.target.value)}
                placeholder="Contoh: Ibu Siti Aminah"
                className="isian-kontrol min-h-[40px] text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="u-user" className="block text-xs font-bold text-[#55665a] mb-1">
                  Username
                </label>
                <input
                  id="u-user"
                  type="text"
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ibu_siti"
                  className="isian-kontrol min-h-[40px] text-xs"
                />
              </div>
              <div>
                <label htmlFor="u-pass" className="block text-xs font-bold text-[#55665a] mb-1">
                  Password (min. 6)
                </label>
                <div className="relative">
                  <input
                    id="u-pass"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 karakter"
                    className="isian-kontrol min-h-[40px] text-xs pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded text-[#55665a] hover:text-[#0f4527] cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="u-hp" className="block text-xs font-bold text-[#55665a] mb-1">
                  Nomor HP
                </label>
                <input
                  id="u-hp"
                  type="text"
                  value={noHp}
                  onChange={(e) => setNoHp(e.target.value)}
                  placeholder="0812..."
                  className="isian-kontrol min-h-[40px] text-xs"
                />
              </div>
              {role === 'Guru' && (
                <div>
                  <label htmlFor="u-kelas" className="block text-xs font-bold text-[#55665a] mb-1">
                    Wali kelas
                  </label>
                  <select
                    id="u-kelas"
                    value={kelasAmpu || kelasList[0]?.nama_kelas || 'Kelas A'}
                    onChange={(e) => setKelasAmpu(e.target.value)}
                    className="isian-kontrol min-h-[40px] text-xs"
                  >
                    {kelasList.map((k) => (
                      <option key={k.kelas_id} value={k.nama_kelas}>
                        {k.nama_kelas}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <button type="submit" disabled={creatingUser} className="tbl w-full">
              {creatingUser ? 'Menyimpan...' : 'Simpan akun'}
            </button>
          </form>

          {/* Tabel Akun */}
          <section className="lg:col-span-8 kartu">
            <div className="judul-baris">
              <h2 className="text-lg text-[#0f4527]">Akun pengguna</h2>
              <span className="text-xs text-[#55665a]">Akun Guru & Orang Tua dibuat oleh Admin</span>
            </div>

            <div className="geser">
              <table className="tabel-bersih">
                <thead>
                  <tr>
                    <th>Nama & username</th>
                    <th>Peran</th>
                    <th>Anak / kelas</th>
                    <th className="text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {db.users.map((u) => {
                    const linkedKids = db.siswa
                      .filter((s) => s.ortu_user_id === u.user_id)
                      .map((s) => s.nama_anak);
                    return (
                      <tr key={u.user_id}>
                        <td>
                          <p className="font-bold text-[#1d2b21]">{u.nama_lengkap}</p>
                          <p className="text-xs text-[#55665a] font-mono-tabular">
                            @{u.username} · {u.no_hp || '-'}
                          </p>
                        </td>
                        <td className="font-semibold">{u.role}</td>
                        <td className="text-[#55665a]">
                          {u.role === 'Guru'
                            ? u.kelas_ampu || '-'
                            : u.role === 'OrangTua'
                            ? linkedKids.length > 0
                              ? linkedKids.join(', ')
                              : 'Belum ada anak'
                            : 'Seluruh sekolah'}
                        </td>
                        <td className="text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            {u.role === 'Admin' ? (
                              <span className="text-xs font-extrabold text-[#0f4527] px-2 py-1 rounded-lg bg-[#dcebd2]/70">
                                Admin Utama
                              </span>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleToggleUserActive(u.user_id)}
                                  className={`tbl polos kecil ${u.status_aktif ? '' : 'opacity-60'}`}
                                >
                                  {u.status_aktif ? 'Aktif' : 'Nonaktif'}
                                </button>
                                {u.user_id !== currentUser?.user_id && (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteUser(u)}
                                    aria-label={`Hapus akun ${u.nama_lengkap}`}
                                    title={`Hapus akun ${u.nama_lengkap}`}
                                    className="p-2 rounded-lg text-[#55665a] hover:text-[#a33a25] hover:bg-[#f8dcd6]/60 cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Murid */}
      {confirmDeleteSiswa && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b1f14]/55 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="judul-hapus-murid"
          onClick={(e) => {
            if (e.target === e.currentTarget && !deletingAction) setConfirmDeleteSiswa(null);
          }}
        >
          <div className="w-full max-w-md bg-[#fffdf7] rounded-[26px] border border-[#d9d5c0] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 id="judul-hapus-murid" className="text-xl text-[#a33a25] inline-flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                <span>Hapus data murid?</span>
              </h2>
              <button
                type="button"
                disabled={deletingAction}
                onClick={() => setConfirmDeleteSiswa(null)}
                aria-label="Tutup dialog"
                className="w-9 h-9 rounded-full flex items-center justify-center text-[#55665a] hover:bg-[#dcebd2] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[#f8dcd6]/55 border border-[#a33a25]/30 text-sm text-[#1d2b21] space-y-1">
              <p className="font-bold text-[#a33a25]">
                {confirmDeleteSiswa.nama_anak} ({confirmDeleteSiswa.kelas_aktif})
              </p>
              <p className="text-xs text-[#55665a] font-mono-tabular">
                NIS {confirmDeleteSiswa.nis} · Status: {confirmDeleteSiswa.status_siswa}
              </p>
            </div>

            <p className="text-xs text-[#55665a] leading-relaxed">
              Seluruh catatan murid ini (riwayat kelas, daftar hadir, antropometri, literasi, keagamaan, asesmen, dan 7 KAIH) ikut dibersihkan dari sistem dan Google Sheets agar data tetap rapi.
            </p>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={deletingAction}
                onClick={() => setConfirmDeleteSiswa(null)}
                className="tbl polos"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deletingAction}
                onClick={handleConfirmDeleteSiswa}
                className="tbl merah"
              >
                {deletingAction ? 'Menghapus...' : 'Ya, hapus murid'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Akun */}
      {confirmDeleteUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b1f14]/55 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="judul-hapus-akun"
          onClick={(e) => {
            if (e.target === e.currentTarget && !deletingAction) setConfirmDeleteUser(null);
          }}
        >
          <div className="w-full max-w-md bg-[#fffdf7] rounded-[26px] border border-[#d9d5c0] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 id="judul-hapus-akun" className="text-xl text-[#a33a25] inline-flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                <span>Hapus akun pengguna?</span>
              </h2>
              <button
                type="button"
                disabled={deletingAction}
                onClick={() => setConfirmDeleteUser(null)}
                aria-label="Tutup dialog"
                className="w-9 h-9 rounded-full flex items-center justify-center text-[#55665a] hover:bg-[#dcebd2] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[#f8dcd6]/55 border border-[#a33a25]/30 text-sm text-[#1d2b21] space-y-1">
              <p className="font-bold text-[#a33a25]">{confirmDeleteUser.nama_lengkap}</p>
              <p className="text-xs text-[#55665a] font-mono-tabular">
                @{confirmDeleteUser.username} · Peran: {confirmDeleteUser.role}
              </p>
            </div>

            {confirmDeleteUser.role === 'OrangTua' && (
              <p className="text-xs text-[#55665a] leading-relaxed">
                {(() => {
                  const linked = db.siswa.filter((s) => s.ortu_user_id === confirmDeleteUser.user_id);
                  if (linked.length === 0) {
                    return 'Akun ini belum terhubung ke murid mana pun. Data murid aman.';
                  }
                  return `${linked.length} anak terhubung (${linked.map((s) => s.nama_anak).join(', ')}) akan dilepas tautannya menjadi "Belum dihubungkan", data anak tetap aman.`;
                })()}
              </p>
            )}
            {confirmDeleteUser.role === 'Guru' && (
              <p className="text-xs text-[#55665a] leading-relaxed">
                Akun guru ini tidak akan bisa login lagi. Catatan perkembangan murid dan rapor yang sudah dibuat tetap tersimpan.
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={deletingAction}
                onClick={() => setConfirmDeleteUser(null)}
                className="tbl polos"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deletingAction}
                onClick={handleConfirmDeleteUser}
                className="tbl merah"
              >
                {deletingAction ? 'Menghapus...' : 'Ya, hapus akun'}
              </button>
            </div>
          </div>
        </div>
      )}
      {showDapodikModal && (
        <DapodikImportModal onClose={() => setShowDapodikModal(false)} />
      )}
    </div>
  );
};
