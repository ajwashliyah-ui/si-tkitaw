import React, { useMemo, useState } from 'react';
import { Eye, EyeOff, UserPlus, GraduationCap, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  JenisKelamin,
  KelasType,
  Siswa,
  StatusSiswa,
  TrackKelasB,
} from '../../types';

export const AdminSiswaUsersView: React.FC = () => {
  const { db, updateDb, createUserByAdmin, addToast } = useApp();
  const [subTab, setSubTab] = useState<'siswa' | 'users'>('siswa');

  // Form Siswa Baru
  const [nis, setNis] = useState('');
  const [namaAnak, setNamaAnak] = useState('');
  const [jk, setJk] = useState<JenisKelamin>('L');
  const [tglLahir, setTglLahir] = useState('2021-05-10');
  const [kelasAktif, setKelasAktif] = useState<KelasType>('Kelas A');
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
      kelas_ampu: role === 'Guru' ? kelasAmpu || 'Kelas A' : undefined,
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

  const handleDeleteSiswa = async (siswaId: string) => {
    await updateDb(
      (prev) => ({
        ...prev,
        siswa: prev.siswa.filter((s) => s.siswa_id !== siswaId),
      }),
      'Data siswa dihapus.'
    );
  };

  return (
    <div className="halaman">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl text-[#0f4527]">Data siswa & akun</h1>
          <p className="text-sm text-[#55665a] mt-1">
            Kelola data anak dan hubungkan satu akun orang tua ke satu atau lebih anak.
          </p>
        </div>

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
                  onChange={(e) => setKelasAktif(e.target.value as KelasType)}
                  className="isian-kontrol min-h-[40px] text-xs"
                >
                  <option value="Kelas A">Kelas A</option>
                  <option value="Kelas B">Kelas B</option>
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

            {kelasAktif === 'Kelas B' && (
              <div>
                <label htmlFor="s-track" className="block text-xs font-bold text-[#55665a] mb-1">
                  Track awal Kelas B
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
            <div className="judul-baris">
              <h2 className="text-lg text-[#0f4527]">Daftar siswa</h2>
              <span className="text-xs text-[#55665a]">{db.siswa.length} anak</span>
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
                        <td className="font-semibold whitespace-nowrap">{s.kelas_aktif}</td>
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
                            onClick={() => handleDeleteSiswa(s.siswa_id)}
                            aria-label={`Hapus ${s.nama_anak}`}
                            className="p-2 rounded-lg text-[#55665a] hover:text-[#a33a25] hover:bg-[#f8dcd6]/60 cursor-pointer"
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
                    value={kelasAmpu || 'Kelas A'}
                    onChange={(e) => setKelasAmpu(e.target.value as KelasType)}
                    className="isian-kontrol min-h-[40px] text-xs"
                  >
                    <option value="Kelas A">Kelas A</option>
                    <option value="Kelas B">Kelas B</option>
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
                          <button
                            type="button"
                            onClick={() => handleToggleUserActive(u.user_id)}
                            className={`tbl polos kecil ${u.status_aktif ? '' : 'opacity-60'}`}
                          >
                            {u.status_aktif ? 'Aktif' : 'Nonaktif'}
                          </button>
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
    </div>
  );
};
