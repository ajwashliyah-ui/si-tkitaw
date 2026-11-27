import React, { useEffect, useMemo, useState } from 'react';
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
  Copy,
  CheckCircle2,
  KeyRound,
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
import {
  AutoParentCredentials,
  buildAutoParentUsername,
  createStudentWithOptionalAutoParent,
} from '../../utils/parentAccountAuto';
import { DapodikImportModal } from './DapodikImportModal';

export const AdminSiswaUsersView: React.FC = () => {
  const {
    db,
    currentUser,
    saving,
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

  // Form Siswa Baru (Otomatis buat & hubungkan akun Orang Tua)
  const [nis, setNis] = useState('');
  const [namaAnak, setNamaAnak] = useState('');
  const [jk, setJk] = useState<JenisKelamin>('L');
  const [tglLahir, setTglLahir] = useState('2021-05-10');
  const [kelasAktif, setKelasAktif] = useState<KelasType>(() => kelasList[0]?.nama_kelas || 'Kelas A');
  const [parentLinkMode, setParentLinkMode] = useState<'auto' | 'existing'>('auto');
  const [ortuUserId, setOrtuUserId] = useState('');
  const [autoParentName, setAutoParentName] = useState('');
  const [autoParentUsername, setAutoParentUsername] = useState('');
  const [usernameEditedManually, setUsernameEditedManually] = useState(false);
  const [autoParentPassword, setAutoParentPassword] = useState('123456');
  const [showAutoPassword, setShowAutoPassword] = useState(false);
  const [autoParentNoHp, setAutoParentNoHp] = useState('');
  const [trackB, setTrackB] = useState<TrackKelasB>('TRACK_1');
  const [submittingSiswa, setSubmittingSiswa] = useState(false);
  const [lastCreatedCreds, setLastCreatedCreds] = useState<AutoParentCredentials | null>(null);

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
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [deletingAction, setDeletingAction] = useState(false);
  const [showDapodikModal, setShowDapodikModal] = useState(false);

  const parentUsers = useMemo(() => db.users.filter((u) => u.role === 'OrangTua'), [db.users]);

  const activeTa = useMemo(
    () => db.tahunAjaran.find((t) => t.status_aktif) || db.tahunAjaran[0],
    [db.tahunAjaran]
  );

  // Sarankan username orang tua otomatis saat NIS/Nama Anak diketik (kecuali admin sudah edit manual)
  useEffect(() => {
    if (parentLinkMode !== 'auto' || usernameEditedManually) return;
    if (!nis.trim() && !namaAnak.trim()) {
      setAutoParentUsername('');
      return;
    }
    const suggested = buildAutoParentUsername(
      namaAnak,
      nis,
      db.users.map((u) => u.username)
    );
    setAutoParentUsername(suggested);
  }, [nis, namaAnak, parentLinkMode, usernameEditedManually, db.users]);

  const handleCopyCredentials = async (creds: AutoParentCredentials) => {
    const text = [
      `Akun Orang Tua ${db.pengaturanSekolah.nama_sekolah}`,
      `Anak: ${creds.nama_anak} (NIS ${creds.nis})`,
      `Nama Akun: ${creds.nama_lengkap}`,
      `Username: ${creds.username}`,
      `Password: ${creds.password}`,
    ].join('\n');
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        addToast('Info login orang tua disalin ke clipboard.', 'success');
      } else {
        addToast(`Username: ${creds.username} · Password: ${creds.password}`, 'info');
      }
    } catch {
      addToast(`Username: ${creds.username} · Password: ${creds.password}`, 'info');
    }
  };

  const handleAddSiswa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nis.trim() || !namaAnak.trim()) {
      addToast('NIS dan nama anak wajib diisi.', 'error');
      return;
    }

    const cleanAutoPass = autoParentPassword.replace(/[\r\n]+/g, '');
    if (parentLinkMode === 'auto') {
      const cleanUser = autoParentUsername.trim().replace(/^@+/, '').replace(/\s+/g, '').toLowerCase();
      if (cleanUser) {
        if (!/^[a-z0-9._-]{3,32}$/.test(cleanUser)) {
          addToast(
            'Username orang tua 3–32 karakter (huruf kecil, angka, titik, garis bawah, atau strip).',
            'error'
          );
          return;
        }
        if (db.users.some((u) => u.username.toLowerCase() === cleanUser)) {
          addToast('Username orang tua sudah dipakai akun lain. Gunakan username lain.', 'error');
          return;
        }
      }
      if (cleanAutoPass.length < 6) {
        addToast('Password awal akun orang tua minimal 6 karakter.', 'error');
        return;
      }
    }

    const wali = db.users.find((u) => u.role === 'Guru' && u.kelas_ampu === kelasAktif);
    const created = createStudentWithOptionalAutoParent({
      nis,
      nama_anak: namaAnak,
      jenis_kelamin: jk,
      tanggal_lahir: tglLahir,
      kelas_aktif: kelasAktif,
      target_literasi_kelas_b: trackB,
      existingUsers: db.users,
      activeTa: activeTa ? { ta_id: activeTa.ta_id, nama_ta: activeTa.nama_ta } : undefined,
      waliKelasId: wali?.user_id || '',
      autoCreateParent: parentLinkMode === 'auto',
      existingOrtuUserId: ortuUserId,
      parentName: autoParentName,
      parentUsername: autoParentUsername.trim().replace(/^@+/, '').replace(/\s+/g, '').toLowerCase(),
      parentPassword: cleanAutoPass,
      parentNoHp: autoParentNoHp,
    });

    setSubmittingSiswa(true);
    const toastMessage = created.newParentUser
      ? `Data ${created.siswa.nama_anak} ditambahkan & akun orang tua (${created.newParentUser.username}) otomatis dibuat.`
      : `Data ${created.siswa.nama_anak} ditambahkan.`;

    const ok = await updateDb(
      (prev) => ({
        ...prev,
        users: created.newParentUser ? [...prev.users, created.newParentUser] : prev.users,
        siswa: [...prev.siswa, created.siswa],
        riwayatKelas: created.riwayat
          ? [...prev.riwayatKelas, created.riwayat]
          : prev.riwayatKelas,
      }),
      toastMessage
    );
    setSubmittingSiswa(false);

    if (ok) {
      if (created.credentials) {
        setLastCreatedCreds(created.credentials);
      }
      setNis('');
      setNamaAnak('');
      setAutoParentName('');
      setAutoParentUsername('');
      setUsernameEditedManually(false);
      setAutoParentNoHp('');
    }
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

  const handleQuickAutoCreateParent = async (s: Siswa) => {
    const cleanChild = String(s.nama_anak ?? '').trim() || 'Murid';
    const suggestedUsername = buildAutoParentUsername(
      cleanChild,
      String(s.nis ?? ''),
      db.users.map((u) => u.username)
    );
    const defaultPassword = '123456';
    const displayName = `Wali ${cleanChild}`.slice(0, 80);
    const userId = `USR-ORT-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;

    const newParentUser: User = {
      user_id: userId,
      username: suggestedUsername,
      password: defaultPassword,
      password_hash: '',
      role: 'OrangTua',
      nama_lengkap: displayName,
      no_hp: '',
      kelas_ampu: '',
      status_aktif: true,
    };

    const ok = await updateDb(
      (prev) => ({
        ...prev,
        users: [...prev.users, newParentUser],
        siswa: prev.siswa.map((row) =>
          row.siswa_id === s.siswa_id ? { ...row, ortu_user_id: userId } : row
        ),
      }),
      `Akun orang tua (@${suggestedUsername}) dibuat & langsung terhubung dengan ${s.nama_anak}.`
    );

    if (ok) {
      setLastCreatedCreds({
        user_id: userId,
        username: suggestedUsername,
        password: defaultPassword,
        nama_lengkap: displayName,
        no_hp: '',
        nama_anak: s.nama_anak,
        nis: s.nis,
      });
    }
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
    const cleanUser = username.trim().replace(/^@+/, '').replace(/\s+/g, '').toLowerCase();
    const cleanPass = password.replace(/[\r\n]+/g, '');
    if (!cleanUser || !cleanPass || !namaLengkap.trim()) {
      addToast('Username, password, dan nama lengkap wajib diisi.', 'error');
      return;
    }
    if (!/^[a-z0-9._-]{3,32}$/.test(cleanUser)) {
      addToast('Username 3–32 karakter (huruf kecil, angka, titik, garis bawah, atau strip).', 'error');
      return;
    }
    if (cleanPass.length < 6) {
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
      password: cleanPass,
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

  const handleResetUserPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordUser) return;
    const cleanPass = resetNewPassword.replace(/[\r\n]+/g, '');
    if (cleanPass.length < 6) {
      addToast('Password baru minimal 6 karakter.', 'error');
      return;
    }
    setResettingPassword(true);
    const ok = await updateDb(
      (prev) => ({
        ...prev,
        users: prev.users.map((u) =>
          u.user_id === resetPasswordUser.user_id ? { ...u, password: cleanPass } : u
        ),
      }),
      `Password untuk @${resetPasswordUser.username} berhasil diatur ulang.`
    );
    setResettingPassword(false);
    if (ok) {
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(
            `Username: ${resetPasswordUser.username}\nPassword: ${cleanPass}`
          );
          addToast('Info login baru disalin ke clipboard.', 'info');
        }
      } catch {
        // Ignore clipboard errors
      }
      setResetPasswordUser(null);
      setResetNewPassword('');
      setShowResetPassword(false);
    }
  };

  const hasAnySheetsConfig = Boolean(
    db.pengaturanSekolah.gas_webapp_url || db.pengaturanSekolah.google_spreadsheet_id
  );

  return (
    <div className="halaman">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl text-[#0f4527]">Data siswa & akun</h1>
          <p className="text-sm text-[#55665a] mt-1">
            Menambah anak otomatis membuat dan menghubungkan akun Orang Tua dalam satu langkah.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasAnySheetsConfig && (
            <button
              type="button"
              disabled={saving}
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
          {/* Form Tambah Siswa + Otomatis Buat Akun Orang Tua */}
          <form onSubmit={handleAddSiswa} className="lg:col-span-4 kartu space-y-3.5">
            <div className="judul-baris">
              <h2 className="text-lg text-[#0f4527] inline-flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-[#176238]" />
                <span>Tambah siswa</span>
              </h2>
            </div>

            {lastCreatedCreds && (
              <div className="rounded-2xl border border-[#9ec48e] bg-[#dcebd2]/55 p-3 space-y-2 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-extrabold text-[#0f4527]">
                    <CheckCircle2 className="w-4 h-4 text-[#176238] shrink-0" />
                    <span>Akun Orang Tua Siap Dipakai!</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLastCreatedCreds(null)}
                    aria-label="Tutup info akun baru"
                    className="text-[#55665a] hover:text-[#0f4527] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="space-y-0.5 text-[#1d2b21]">
                  <p className="m-0">
                    Anak: <strong>{lastCreatedCreds.nama_anak}</strong> ({lastCreatedCreds.nama_lengkap})
                  </p>
                  <p className="m-0 font-mono-tabular">
                    Username: <strong>{lastCreatedCreds.username}</strong> · Password:{' '}
                    <strong>{lastCreatedCreds.password}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyCredentials(lastCreatedCreds)}
                  className="tbl polos kecil w-full"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin Info Login</span>
                </button>
              </div>
            )}

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

            {/* Bagian Akun Orang Tua Otomatis vs Pilih yang Ada */}
            <div className="rounded-2xl border border-[#d9d5c0] bg-[#fbf6e7] p-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-[#0f4527]">Akun Orang Tua</span>
                <div className="inline-flex rounded-lg border border-[#d9d5c0] bg-white p-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setParentLinkMode('auto')}
                    className={`px-2 py-1 rounded-md font-bold cursor-pointer transition-colors ${
                      parentLinkMode === 'auto'
                        ? 'bg-[#176238] text-white'
                        : 'text-[#55665a] hover:text-[#0f4527]'
                    }`}
                  >
                    Buat Otomatis
                  </button>
                  <button
                    type="button"
                    onClick={() => setParentLinkMode('existing')}
                    className={`px-2 py-1 rounded-md font-bold cursor-pointer transition-colors ${
                      parentLinkMode === 'existing'
                        ? 'bg-[#176238] text-white'
                        : 'text-[#55665a] hover:text-[#0f4527]'
                    }`}
                  >
                    Akun Ada
                  </button>
                </div>
              </div>

              {parentLinkMode === 'auto' ? (
                <div className="space-y-2.5">
                  <div>
                    <label htmlFor="s-ortu-nama" className="block text-[11px] font-bold text-[#55665a] mb-1">
                      Nama orang tua / wali (opsional)
                    </label>
                    <input
                      id="s-ortu-nama"
                      type="text"
                      value={autoParentName}
                      onChange={(e) => setAutoParentName(e.target.value)}
                      placeholder={namaAnak.trim() ? `Otomatis: Wali ${namaAnak.trim()}` : 'Contoh: Ibu Aisyah'}
                      className="isian-kontrol min-h-[38px] text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label htmlFor="s-ortu-user" className="block text-[11px] font-bold text-[#55665a] mb-1">
                        Username ortu
                      </label>
                      <input
                        id="s-ortu-user"
                        type="text"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        value={autoParentUsername}
                        onChange={(e) => {
                          setUsernameEditedManually(true);
                          setAutoParentUsername(
                            e.target.value.replace(/^@+/, '').replace(/\s+/g, '').toLowerCase()
                          );
                        }}
                        placeholder="Otomatis dari NIS"
                        className="isian-kontrol min-h-[38px] text-xs font-mono-tabular"
                      />
                    </div>
                    <div>
                      <label htmlFor="s-ortu-pass" className="block text-[11px] font-bold text-[#55665a] mb-1">
                        Password awal
                      </label>
                      <div className="relative">
                        <input
                          id="s-ortu-pass"
                          type={showAutoPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                          value={autoParentPassword}
                          onChange={(e) => setAutoParentPassword(e.target.value)}
                          className="isian-kontrol min-h-[38px] text-xs pr-8 font-mono-tabular"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAutoPassword((v) => !v)}
                          aria-label={showAutoPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded text-[#55665a] hover:text-[#0f4527] cursor-pointer"
                        >
                          {showAutoPassword ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="s-ortu-hp" className="block text-[11px] font-bold text-[#55665a] mb-1">
                      Nomor HP orang tua (opsional)
                    </label>
                    <input
                      id="s-ortu-hp"
                      type="text"
                      value={autoParentNoHp}
                      onChange={(e) => setAutoParentNoHp(e.target.value)}
                      placeholder="0812..."
                      className="isian-kontrol min-h-[38px] text-xs"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label htmlFor="s-ortu" className="block text-[11px] font-bold text-[#55665a] mb-1">
                    Pilih akun orang tua (misal saudara sekandung)
                  </label>
                  <select
                    id="s-ortu"
                    value={ortuUserId}
                    onChange={(e) => setOrtuUserId(e.target.value)}
                    className="isian-kontrol min-h-[38px] text-xs"
                  >
                    <option value="">Belum dihubungkan</option>
                    {parentUsers.map((u) => (
                      <option key={u.user_id} value={u.user_id}>
                        {u.nama_lengkap} (@{u.username})
                      </option>
                    ))}
                  </select>
                </div>
              )}
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

            <button type="submit" disabled={submittingSiswa || saving} className="tbl w-full">
              {submittingSiswa
                ? 'Menyimpan...'
                : parentLinkMode === 'auto'
                ? 'Simpan Siswa & Buat Akun Ortu'
                : 'Simpan siswa'}
            </button>
          </form>

          {/* Tabel Siswa */}
          <section className="lg:col-span-8 kartu">
            <div className="judul-baris flex-wrap gap-2">
              <div>
                <h2 className="text-lg text-[#0f4527]">Daftar siswa</h2>
                <span className="text-xs text-[#55665a]">
                  {db.siswa.length} anak
                  {syncStatus.connected && syncStatus.lastSyncAt
                    ? ` · Tersinkron ke Google Sheet`
                    : syncStatus.lastError
                    ? ` · Gagal sinkron Sheet: ${syncStatus.lastError}`
                    : ''}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={pushToSheets}
                  disabled={db.siswa.length === 0 || saving}
                  className="tbl polos kecil"
                  title="Kirim seluruh data siswa terbaru langsung ke Google Sheets"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Kirim ke Sheet</span>
                </button>
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
                              className="isian-kontrol min-h-[36px] py-1 text-xs min-w-[116px] w-full max-w-[175px]"
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
                          {(() => {
                            const linkedParent = parentUsers.find((u) => u.user_id === s.ortu_user_id);
                            return (
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <select
                                    aria-label={`Akun orang tua untuk ${s.nama_anak}`}
                                    value={s.ortu_user_id}
                                    onChange={(e) => handleUpdateSiswaOrtu(s.siswa_id, e.target.value)}
                                    className="isian-kontrol min-h-[36px] py-1 text-xs min-w-[196px] w-full max-w-[235px]"
                                  >
                                    <option value="">Belum dihubungkan</option>
                                    {parentUsers.map((u) => (
                                      <option key={u.user_id} value={u.user_id}>
                                        {u.nama_lengkap} (@{u.username})
                                      </option>
                                    ))}
                                  </select>
                                  {!linkedParent && (
                                    <button
                                      type="button"
                                      disabled={saving}
                                      onClick={() => void handleQuickAutoCreateParent(s)}
                                      className="tbl kecil"
                                      title={`Buat otomatis & hubungkan akun orang tua untuk ${s.nama_anak}`}
                                    >
                                      <UserPlus className="w-3.5 h-3.5" />
                                      <span>Buat Otomatis</span>
                                    </button>
                                  )}
                                </div>
                                {linkedParent && (
                                  <p className="text-[11px] text-[#176238] font-mono-tabular m-0">
                                    Terhubung: @{linkedParent.username}
                                  </p>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td>
                          <select
                            aria-label={`Status ${s.nama_anak}`}
                            value={s.status_siswa}
                            onChange={(e) =>
                              handleUpdateSiswaStatus(s.siswa_id, e.target.value as StatusSiswa)
                            }
                            className="isian-kontrol min-h-[36px] py-1 text-xs min-w-[96px] w-auto"
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
                  onChange={(e) =>
                    setUsername(
                      e.target.value.replace(/^@+/, '').replace(/\s+/g, '').toLowerCase()
                    )
                  }
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
                                <button
                                  type="button"
                                  onClick={() => {
                                    setResetPasswordUser(u);
                                    setResetNewPassword('');
                                    setShowResetPassword(false);
                                  }}
                                  aria-label={`Atur ulang password ${u.nama_lengkap}`}
                                  title={`Atur ulang password ${u.nama_lengkap}`}
                                  className="p-2 rounded-lg text-[#55665a] hover:text-[#0f4527] hover:bg-[#dcebd2]/70 cursor-pointer"
                                >
                                  <KeyRound className="w-4 h-4" />
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
      {/* Modal Reset Password Pengguna */}
      {resetPasswordUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b1f14]/55 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="judul-reset-password"
          onClick={(e) => {
            if (e.target === e.currentTarget && !resettingPassword) setResetPasswordUser(null);
          }}
        >
          <form
            onSubmit={handleResetUserPassword}
            className="w-full max-w-md bg-[#fffdf7] rounded-[26px] border border-[#d9d5c0] p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 id="judul-reset-password" className="text-xl text-[#0f4527] inline-flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-[#176238]" />
                <span>Atur ulang password</span>
              </h2>
              <button
                type="button"
                disabled={resettingPassword}
                onClick={() => setResetPasswordUser(null)}
                aria-label="Tutup dialog"
                className="w-9 h-9 rounded-full flex items-center justify-center text-[#55665a] hover:bg-[#dcebd2] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[#dcebd2]/45 border border-[#9ec48e] text-sm text-[#1d2b21] space-y-1">
              <p className="font-bold text-[#0f4527] m-0">{resetPasswordUser.nama_lengkap}</p>
              <p className="text-xs text-[#55665a] font-mono-tabular m-0">
                Username: <strong>{resetPasswordUser.username}</strong> · Peran: {resetPasswordUser.role}
              </p>
            </div>

            <label className="block">
              <span className="block font-extrabold text-xs mb-1 text-[#1d2b21]">
                Password baru (min. 6 karakter)
              </span>
              <div className="relative">
                <input
                  type={showResetPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  placeholder="Masukkan password baru"
                  className="isian-kontrol pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowResetPassword((v) => !v)}
                  aria-label={showResetPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-[#55665a] hover:text-[#0f4527] hover:bg-[#dcebd2]/50 cursor-pointer"
                >
                  {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </label>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={resettingPassword}
                onClick={() => setResetPasswordUser(null)}
                className="tbl polos"
              >
                Batal
              </button>
              <button type="submit" disabled={resettingPassword || saving} className="tbl">
                {resettingPassword ? 'Menyimpan...' : 'Simpan Password Baru'}
              </button>
            </div>
          </form>
        </div>
      )}

      {showDapodikModal && (
        <DapodikImportModal onClose={() => setShowDapodikModal(false)} />
      )}
    </div>
  );
};
