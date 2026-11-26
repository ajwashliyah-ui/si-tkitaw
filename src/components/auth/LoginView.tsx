import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MotionTabBar } from '../common/MotionPrimitives';

interface LoginViewProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ isOpen, onClose }) => {
  const { login, setupAdmin, adminClaimed } = useApp();
  const [mode, setMode] = useState<'login' | 'setup_admin'>('login');

  // Login state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // First-time single Admin setup state
  const [adminNama, setAdminNama] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminNoHp, setAdminNoHp] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (adminClaimed && mode === 'setup_admin') {
      setMode('login');
      setError('');
    }
  }, [adminClaimed, mode]);

  if (!isOpen) return null;

  const switchMode = (next: 'login' | 'setup_admin') => {
    if (adminClaimed && next === 'setup_admin') return;
    setMode(next);
    setError('');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('Mohon isi username dan password.');
      return;
    }
    setSubmitting(true);
    const res = await login(username.trim(), password);
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error || 'Username atau password tidak sesuai.');
    }
  };

  const handleSetupAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleanUser = adminUsername.trim().toLowerCase();
    if (!adminNama.trim()) {
      setError('Mohon isi nama lengkap Admin / Kepala Sekolah.');
      return;
    }
    if (!/^[a-z0-9._-]{3,32}$/.test(cleanUser)) {
      setError('Username 3–32 karakter: huruf kecil, angka, titik, garis bawah, atau strip.');
      return;
    }
    if (adminPassword.length < 6) {
      setError('Password minimal 6 karakter.');
      return;
    }
    if (adminPassword !== adminPasswordConfirm) {
      setError('Konfirmasi password belum sama.');
      return;
    }

    setSubmitting(true);
    const res = await setupAdmin({
      username: cleanUser,
      password: adminPassword,
      nama_lengkap: adminNama.trim(),
      no_hp: adminNoHp.trim(),
    });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error || 'Gagal mendaftarkan Admin sekolah.');
    }
  };

  const showSetupTab = !adminClaimed;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0f2c1c]/60 backdrop-blur-[2px] overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-masuk-judul"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div className="w-full max-w-[480px] rounded-[26px] bg-[#fffdf7] text-[#1d2b21] p-6 shadow-2xl border border-[#d9d5c0] animate-[naik_.25s_both] my-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h2 id="dialog-masuk-judul" className="text-xl text-[#0f4527] m-0">
              {mode === 'login' ? 'Masuk ke buku laporan' : 'Daftar Admin Sekolah'}
            </h2>
            <p className="text-xs text-[#55665a] mt-0.5 m-0">
              {mode === 'login'
                ? 'Gunakan akun Guru, Orang Tua, atau Admin sekolah.'
                : 'Penyiapan awal khusus 1 akun Admin pengelola sekolah.'}
            </p>
          </div>

          {showSetupTab && (
            <MotionTabBar
              layoutId="login-mode-tab-pill"
              ariaLabel="Pilih masuk atau pendaftaran admin"
              value={mode}
              onChange={switchMode}
              options={[
                { id: 'login', label: 'Masuk' },
                { id: 'setup_admin', label: 'Daftar Admin' },
              ]}
            />
          )}
        </div>

        {mode === 'login' || !showSetupTab ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <label className="block">
              <span className="block font-extrabold text-sm mb-1 text-[#1d2b21]">Username</span>
              <input
                type="text"
                required
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username akun"
                className="isian-kontrol"
              />
            </label>

            <label className="block">
              <span className="block font-extrabold text-sm mb-1 text-[#1d2b21]">Password</span>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="isian-kontrol pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-[#55665a] hover:text-[#0f4527] hover:bg-[#dcebd2]/50 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </label>

            {error && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-[#f8dcd6] border border-[#a33a25]/40 text-xs font-semibold text-[#a33a25]"
              >
                {error}
              </div>
            )}

            {showSetupTab ? (
              <div className="rounded-xl border border-[#9ec48e] bg-[#dcebd2]/40 px-3 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-[#1d2b21]">
                  Belum membuat akun Admin sekolah?
                </span>
                <button
                  type="button"
                  onClick={() => switchMode('setup_admin')}
                  className="font-extrabold text-[#0f4527] underline underline-offset-2 cursor-pointer"
                >
                  Daftar Admin (1x)
                </button>
              </div>
            ) : (
              <p className="text-[11px] text-[#55665a] bg-[#fbf6e7] border border-[#d9d5c0] rounded-xl px-3 py-2 leading-relaxed m-0">
                Akun Guru dan Orang Tua dibuatkan langsung oleh Admin sekolah melalui menu{' '}
                <strong className="text-[#0f4527]">Siswa &amp; akun</strong>.
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={submitting}
                onClick={onClose}
                className="tbl polos"
              >
                Batal
              </button>
              <button type="submit" disabled={submitting} className="tbl">
                {submitting ? 'Memeriksa akun...' : 'Masuk'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSetupAdminSubmit} className="space-y-3.5">
            <div className="rounded-xl border border-[#9ec48e] bg-[#dcebd2]/45 px-3 py-2.5 flex items-start gap-2.5 text-xs text-[#0f4527]">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-[#176238]" />
              <p className="m-0 leading-relaxed">
                Pendaftaran Admin hanya berlaku <strong>satu kali</strong> untuk pengelola utama sekolah.
                Setelah aktif, akun Guru dan Orang Tua dibuat dari dalam panel Admin.
              </p>
            </div>

            <label className="block">
              <span className="block font-extrabold text-xs mb-1 text-[#1d2b21]">Nama lengkap Admin</span>
              <input
                type="text"
                required
                value={adminNama}
                onChange={(e) => setAdminNama(e.target.value)}
                placeholder="Contoh: Obi Abdulah Sapari"
                className="isian-kontrol"
              />
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="block font-extrabold text-xs mb-1 text-[#1d2b21]">Username Admin</span>
                <input
                  type="text"
                  required
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  placeholder="Contoh: admin_sekolah"
                  className="isian-kontrol"
                />
              </label>

              <label className="block">
                <span className="block font-extrabold text-xs mb-1 text-[#1d2b21]">
                  No. WhatsApp (opsional)
                </span>
                <input
                  type="tel"
                  value={adminNoHp}
                  onChange={(e) => setAdminNoHp(e.target.value)}
                  placeholder="0812..."
                  className="isian-kontrol"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="block font-extrabold text-xs mb-1 text-[#1d2b21]">
                  Password (min. 6 karakter)
                </span>
                <div className="relative">
                  <input
                    type={showAdminPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="isian-kontrol pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword((v) => !v)}
                    aria-label={showAdminPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-[#55665a] hover:text-[#0f4527] hover:bg-[#dcebd2]/50 cursor-pointer"
                  >
                    {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </label>

              <label className="block">
                <span className="block font-extrabold text-xs mb-1 text-[#1d2b21]">
                  Ulangi password
                </span>
                <input
                  type={showAdminPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={adminPasswordConfirm}
                  onChange={(e) => setAdminPasswordConfirm(e.target.value)}
                  placeholder="Ketik ulang password"
                  className="isian-kontrol"
                />
              </label>
            </div>

            {error && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-[#f8dcd6] border border-[#a33a25]/40 text-xs font-semibold text-[#a33a25]"
              >
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={submitting}
                onClick={onClose}
                className="tbl polos"
              >
                Batal
              </button>
              <button type="submit" disabled={submitting} className="tbl">
                {submitting ? 'Menyiapkan akun...' : 'Daftarkan Admin & Masuk'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
